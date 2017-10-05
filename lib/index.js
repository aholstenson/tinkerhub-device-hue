'use strict';

const Device = require('tinkerhub/device');
const Storage = require('tinkerhub/storage');
const State = require('tinkerhub/capabilities/state');

const url = require('url');
const Q = require('q');
const hue = require('node-hue-api');
const Light = require('./light');

const browser = require('tinkerhub-ssdp').browser('upnp:rootdevice');
const devices = {};

browser.on('available', function(device) {
	let id = device.headers['HUE-BRIDGEID'];
	if(! id) return;

	// Normalize to lower case as that matches the nupnp search
	id = id.toLowerCase();

    if(devices[id]) return;
    const parsedUrl = url.parse(device.location);
	devices[id] = new Bridge(id, parsedUrl.host);
	devices[id].register();
});

browser.on('unavailable', function(device) {
    const id = device.headers['HUE-BRIDGEID'];
    const registered = device[id];
    if(registered) {
        registered.remove();
        delete device[id];
    }
});

// Run the nupnp discovery once
hue.nupnpSearch()
    .then(bridges => {
        bridges.forEach(b => {
            if(! b.id || devices[b.id]) return;

			devices[b.id] = new Bridge(b.id, b.ipaddress);
			devices[b.id].register();

			// TODO: Removal?
        });
	})
	.catch(e => {
		console.error(e);
	});

class Bridge extends Device.with(Storage, State) {
	static get type() {
		return 'bridge-hue';
	}

	static get availableAPI() {
		return [
			'link'
		];
	}

    constructor(id, host) {
		super();

        this.id = 'hue:' + id.toLowerCase();
		this.metadata.name = 'Hue Bridge';

		this.updateState('linked', false);

        this.host = host;
        this.lights = {};

        // Load authentication if we have it
        const auth = this.storage.get('auth');
        if(auth) {
            this._init(auth);
        }
    }

    _init(auth) {
        this.api = new hue.HueApi(this.host, auth);

		this.updateState('linked', true);

        this.searchForLights();
        this.lightInterval = setInterval(this.searchForLights.bind(this), 5000);
    }

    remove() {
		super.remove();

		clearInterval(this.lightInterval);
		for(const light of this.lights) {
			light.remove();
		}
    }

    link() {
        const storage = this.storage;
        if(storage.get('auth')) return 'Already linked';

        const deferred = Q.defer();

        setImmediate(() => {
            deferred.notify({
                type: 'link',
                message: 'Press link button on Hue bridge'
            });

            let i = 0;
            const checkLink = () => {
                i++;

                new hue.HueApi()
                    .registerUser(this.host, null, null)
                    .then(result => {
                        storage.put('auth', result);

                        this.init(result);

                        deferred.resolve({
                            status: 200,
                            message: 'Linked with bridge'
                        });
                    })
                    .fail(() => {
                        if(i < 10) {
                            setTimeout(checkLink, 1000);
                        } else {
                            deferred.reject('Link button was not pressed');
                        }
                    })
                    .done();
            };

            checkLink();
        });

        return deferred.promise;
    }

    searchForLights() {
        this.api.lights()
            .then(registeredLights => {
                let found = {};

                // Update or create devices for all found lights
                registeredLights.lights.forEach(def => {
                    found[def.uniqueid] = true;
                    if(this.lights[def.uniqueid]) {
                        this.lights[def.uniqueid].setExternalState(def.state);
                    } else {
						this.lights[def.uniqueid] = new Light(this.api, def);
						this.lights[def.uniqueid].register();
                    }
                });

                // Remove any lights no longer available
                Object.keys(this.lights).forEach(function(l) {
                    if(! found[l]) {
                        this.lights[l].remove();
                        delete this.lights[l];
                    }
                });
            })
            .fail(err => {
                this.debug('Could not load lights', err, err.stack);
            })
            .done();
    }
}
