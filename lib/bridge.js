'use strict';

const { Appliance, State, Children, Storage } = require('appliances');
const Light = require('./light');

const throat = require('throat');
const url = require('url');
const axios = require('axios');

module.exports = class Bridge extends Appliance.with(State, Storage, Children) {
	static get type() {
		return 'hue:bridge';
	}

	static availableAPI(builder) {
		builder.state('linked')
			.type('boolean')
			.description('If this Hue bridge has been linked')
			.done();

		builder.action('link')
			.done();
	}

	constructor(options) {
		super();

		this.id = 'hue:bridge:' + options.id;

		this.throttle = throat(6);

		const parsedUrl = url.parse(options.url);

		this.http = axios.create({
			baseURL: parsedUrl.protocol + '//' + parsedUrl.host,
			timeout: 1000,

			responseType: 'json'
		});
	}

	_sendRequest(options) {
		return this.throttle(() => this.http.request(options))
			.then(response => {
				if(Array.isArray(response.data)) {
					const data = response.data.map(d => {
						if(d.error) {
							throw new Error('Could not complete call: ' + JSON.stringify(d.error));
						}

						return d.success;
					});

					if(options.multiple) {
						return data;
					}

					if(data.length === 0) {
						throw new Error('Bridge did not have a reply');
					}

					return data[0];
				} else {
					return response.data;
				}
			});
	}

	_sendApiRequest(options) {
		options.url = 'api/' + this.authKey + '/' + options.url;
		return this._sendRequest(options);
	}

	initialize() {
		const storage = this.storage;
		return storage.get('apiKey')
			.then(apiKey => {
				if(apiKey) {
					this._initialize(apiKey);
				} else {
					this.updateState('linked', false);
				}
			})
			.then(() => {
				this._stateSearchInterval = setInterval(this._syncState.bind(this), 5000);
				return this;
			});
	}

	destroy() {
		clearInterval(this._stateSearchInterval);
	}

	_initialize(authKey) {
		this.authKey = authKey;

		return this._loadState()
			.then(() => {
				// Set us a linked when we can actually load the data
				this.updateState('linked', true);
				return this;
			})
			.catch(err => {
				// TODO: Determine which errors should result in a retry
				this.updateState('linked', false);

				this.debug('Got error during initialization', err.message);
			});
	}

	_loadState() {
		return this._sendRequest({
			method: 'GET',
			url: 'api/' + this.authKey,
			timeout: 4800
		}).then(data => this._setState(data));
	}

	_syncState() {
		this.debug('Synchronizing state');
		this._loadState()
			.catch(err => {
				this.debug('Could not synchronize state;', err.message);
			});
	}

	_setState(state) {
		/*
		 * Collect all of the definitions that we are going to create
		 * appliances for.
		 */
		const defs = [];
		for(const type of [ 'lights', 'sensors' ]) {
			for(const id of Object.keys(state[type])) {
				const def = state[type][id];

				// Only pull in lights and sensors with unique identifiers
				if(! def.uniqueid) continue;

				// For sensors, skip exposing non-reachable
				if(def.config && ! def.config.reachable) continue;

				// For lights, skip exposing non-reachable
				if(def.state && ! def.state.reachable) continue;

				// Generate the identifier used by taking the unique id and removing colons
				def.id = 'hue:' + def.uniqueid.replace(/\:/g, '');
				def.internalId = id;
				def.type = type;

				defs.push(def);
			}
		}

		this.syncChildren(defs, (child, def) => {
			if(child) {
				// This child already exists, update the definition
				child.setExternalState(def.state);
				return child;
			} else {
				// No existing child, create new ones
				if(def.type === 'lights') {
					return new Light(this, def);
				}
			}
		});
	}

	link() {
		if(this.getState('linked')) return Promise.resolve(true);

		return new Promise(resolve => {
			let attempt = 0;
			const maxAttempts = 10;

			const tryRequest = () => {
				attempt++;
				this._sendRequest({
					method: 'POST',
					url: 'api',

					data: {
						'devicetype': 'Tinkerhub'
					}
				}).then(result => {
					this.debug('Linked to gateway, storing');

					this.storage.set('apiKey', result.username)
						.then(() => this._initialize(result.username))
						.then(resolve);
				}).catch(err => {
					this.debug('Link error', err);
					if(attempt < maxAttempts) {
						setTimeout(tryRequest, 1000);
					} else {
						this.debug('Giving up with linking');
						resolve(false);
					}
				})
			};

			tryRequest();
		});
	}
}
