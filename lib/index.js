'use strict';

var th = require('tinkerhub');

var Q = require('q');
var hue = require('node-hue-api');
var Light = require('./light');

var devices = {};

/**
 * Scan for bridges on the network.
 */
/*
function scan() {
    hue.nupnpSearch()
        .then(function(bridges) {
            bridges.forEach(registerBridge);
            if(bridges.length === 0) {
                scanAlt();
            }
        })
        .fail(scanAlt)
        .done();
}
*/

function scan() {
    scanAlt();
}

function scanAlt() {
    hue.upnpSearch()
        .then(function(b) {
            if(! b || ! Array.isArray(b)) return;
            b.forEach(registerBridge);
        })
        .done();
}

/**
 * Register a bridge as a device.
 */
function registerBridge(data) {
    // Protect against null values when scanning for bridges
    if(! data) return;

    if(devices[data.id]) {
        // This device is already registered
        return;
    }

    const host = data.ipaddress;

    let device;
    let lights = {};
    let lightInterval;
    let api;

    /**
     * Perform inital link with this bridge. This will initiate a wait
     * where the user has 10 seconds to press the link button on the
     * bridge.
     */
    function link() {
        const auth = th.storage.get('hue:' + data.id);
        if(auth) return;

        const deferred = Q.defer();

        setImmediate(() => {
            deferred.notify({
                type: 'link',
                message: 'Press link button on Hue'
            });

            let i = 0;
            const checkLink = function() {
                i++;

                new hue.HueApi().registerUser(host, null, null)
                .then(result => {
                    var authData = {
                        user: result
                    };

                    th.storage.put('hue:' + data.id, authData);

                    deferred.resolve({
                        status: 200,
                        message: 'Linked with bridge'
                    });

                    init(authData);
                })
                .fail(() => {
                    if(i < 10) {
                        setTimeout(checkLink, 1000);
                    } else {
                        deferred.reject({
                            status: 403,
                            message: 'Link button was not pressed'
                        });
                    }
                })
                .done();
            };

            checkLink();
        });

        return deferred.promise;
    }

    function init(data) {
        api = new hue.HueApi(host, data.user);

        searchForLights();
        lightInterval = setInterval(searchForLights, 5000);
    }

    function removeDevice() {
        Object.keys(lights).forEach(function(key) {
            lights[key]._remove();
        });

        device.remove();
        delete devices[data.id];
        clearInterval(lightInterval);

        scan();
    }

    let searchErrorCount = 0;
    function searchForLights() {
        api.lights()
            .then(function(registeredLights) {
                searchErrorCount = 0;
                let found = {};

                // Update or create devices for all found lights
                registeredLights.lights.forEach(function(def) {
                    found[def.uniqueid] = true;
                    if(lights[def.uniqueid]) {
                        lights[def.uniqueid]._updateState(def.state);
                    } else {
                        lights[def.uniqueid] = new Light(api, def);
                    }
                });

                // Remove any lights no longer available
                Object.keys(lights).forEach(function(l) {
                    if(! found[l]) {
                        lights[l]._remove();
                        delete lights[l];
                    }
                });
            })
            .fail(function(err) {
                device.debug('Could not load lights', err, err.stack);
                if(++searchErrorCount > 10) {
                    device.debug('Failure to load lights 10 times in a row. Removing bridge.');
                    removeDevice();
                }
            })
            .done();
    }

    function state() {
        if(! api) {
            return {
                linked: false
            };
        } else {
            return {
                linked: true,
            };
        }
    }

    device = devices[data.id] = th.devices.register('hue:' + data.id, {
        metadata: {
            type: 'hue-bridge',
            capabilities: [ 'config', 'state' ],
            name: 'Hue Bridge'
        },

        link: link,

        state: state
    });

    var stored = th.storage.get('hue:' + data.id);
    if(stored) {
        init(stored);
    }
}


// Start scanning for bridges
scan();

setInterval(scanAlt, 60000);
