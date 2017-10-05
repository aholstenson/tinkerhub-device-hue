'use strict';

var th = require('tinkerhub');

const url = require('url');
var Q = require('q');
var hue = require('node-hue-api');
var Light = require('./light');

const browser = require('tinkerhub-ssdp').browser('upnp:rootdevice');
const devices = {};

browser.on('available', function(device) {
    const id = device.headers['HUE-BRIDGEID'];
    if(! id) return;
    console.log('hue', id, 'at', device.location);

    if(devices[id]) return;
    const parsedUrl = url.parse(device.location);
    devices[id] = new Bridge(id, parsedUrl.host);
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
            console.log(b);
            if(! b.id || devices[b.id]) return;

            devices[b.id] = new Bridge(b.id, b.ipaddress);
        });
    });

class Bridge {
    constructor(id, host) {
        this.metadata = {
            type: 'bridge-hue',
            capabilities: [ 'state' ],
            name: 'Hue Bridge'
        };

        this.state = {
            linked: false
        };

        this._host = host;
        this._lights = {};
        this._handle = th.devices.register('hue:' + id.toLowerCase(), this);

        // Load authentication if we have it
        const storage = this._handle.storage();
        const auth = storage.get('auth')
        if(auth) {
            this._init(auth);
        }
    }

    init(auth) {
        this._api = new hue.HueApi(host, auth);
        this.state.linked = true;
        this._searchForLights();
        this._lightInterval = setInterval(this._searchForLights.bind(this), 5000);
    }

    _remove() {
        this._handle.remove();
        clearInterval(this.lightInterval);
        Object.keys(this._lights).forEach(key => {
            this._lights[key]._remove();
        })
    }

    link() {
        const storage = this._handle.storage();
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
                    .registerUser(this._host, null, null)
                    .then(result => {
                        storage.put(result);

                        this._init(authData);

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

    _searchForLights() {
        this._api.lights()
            .then(registeredLights => {
                let found = {};

                // Update or create devices for all found lights
                registeredLights.lights.forEach(function(def) {
                    found[def.uniqueid] = true;
                    if(this._lights[def.uniqueid]) {
                        this._lights[def.uniqueid]._updateState(def.state);
                    } else {
                        this._lights[def.uniqueid] = new Light(this._api, def);
                    }
                });

                // Remove any lights no longer available
                Object.keys(this._lights).forEach(function(l) {
                    if(! found[l]) {
                        this._lights[l]._remove();
                        delete this._lights[l];
                    }
                });
            })
            .fail(function(err) {
                this._handle.debug('Could not load lights', err, err.stack);
            })
            .done();
    }
}
