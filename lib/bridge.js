'use strict';

const { Thing, State, Children, Storage, Nameable } = require('abstract-things');

const WebSocket = require('ws');
const sensors = require('./sensors');
const lights = require('./lights');

const throat = require('throat');
const url = require('url');
const axios = require('axios');

module.exports = class Bridge extends Thing.with(State, Storage, Children, Nameable) {
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

		this.throttle = throat(8);

		const parsedUrl = url.parse(options.url);

		this.http = axios.create({
			baseURL: parsedUrl.protocol + '//' + parsedUrl.host,
			timeout: 1000,

			responseType: 'json'
		});
		this.host = parsedUrl.host;

		this._websocketListener = this._websocketListener.bind(this);
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

	initCallback() {
		const storage = this.storage;
		return super.initCallback()
			.then(() => {
				return storage.get('apiKey')
			})
			.then(apiKey => {
				if(apiKey) {
					return this._initialize(apiKey);
				} else {
					this.updateState('linked', false);
				}
			});
	}

	destroyCallback() {
		return super.destroyCallback()
			.then(() => clearInterval(this._stateSearchInterval));
	}

	_initialize(authKey) {
		this.authKey = authKey;

		return this._loadState()
			.then(() => {
				// Set us a linked when we can actually load the data
				this.updateState('linked', true);

				if(this.websocketport) {
					this._websocketListener();
				}

				this._stateSearchInterval = setInterval(this._syncState.bind(this), 5000);
				return this;
			})
			.catch(err => {
				// TODO: Determine which errors should result in a retry
				this.updateState('linked', false);

				this.debug('Got error during initialization', err);
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
			.then(() => {
				if(this.websocketport && ! this._ws) {
					// WebSocket port may have changed or been added
					this._websocketListener();
				}
			})
			.catch(err => {
				this.debug('Could not synchronize state;', err);
			});
	}

	_setState(state) {
		// Update the name of the bridge
		this.metadata.name = state.config.name;

		// Update the port of the websocket if supported
		if(state.config.websocketport) {
			this.websocketport = state.config.websocketport;
		}

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
				if(def.config && typeof def.config.reachable !== 'undefined' && ! def.config.reachable) continue;

				// For lights, skip exposing non-reachable
				if(! def.config && def.state && ! def.state.reachable) continue;

				// Generate the identifier used by taking the unique id and removing colons
				def.id = 'hue:' + def.uniqueid.replace(/:/g, '');
				def.internalId = id;
				def.source = type;

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
				if(def.source === 'lights') {
					// Pick the light implementation to use
					const light = lights(def);
					if(light) {
						const result = new light(this, def);
						result.setExternalState(def.state);
						return result;
					}
				} else if(def.source === 'sensors') {
					// Pick a sensor and create it if found
					const sensor = sensors(def);
					if(sensor) {
						const result = new sensor(this, def);
						result.setExternalState(def.state);
						return result;
					}
				}
			}
		});
	}

	_websocketListener() {
		const socket  = this._ws = new WebSocket('ws://' + this.host + ':' + this.websocketport);
		this._websocketReconnect = setTimeout(() => {
			this._ws = null;
			this._websocketListener();
		}, 5000);

		socket.on('open', () => {
			clearTimeout(this._websocketReconnect);
			this.debug('Listening to changes via WebSocket');
		});

		socket.on('error', err => {
			this.debug('WebSocket error', err);
		});

		socket.on('close', () => {
			this.debug('Socket has been closed');
			this._ws = null;
			clearTimeout(this._websocketReconnect);
			this._websocketReconnect = setTimeout(this._websocketListener, 5000);
		});

		socket.on('message', msg => {
			const data = JSON.parse(msg);
			if(data.e === 'changed' && data.t === 'event') {
				const child = this.findChild(c => c._def.internalId == data.id && c._def.source == data.r);

				if(child) {
					if(data.state) {
						child.setExternalState(data.state);
					}
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

	changeName(name) {
		return this._sendApiRequest({
			method: 'PUT',
			url: 'config',
			data: { name: name }
		}).then(() => this.metadata.name = name);
	}
}
