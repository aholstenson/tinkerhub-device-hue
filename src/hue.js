var th = require('tinkerhub');

var Q = require('q');
var hue = require('node-hue-api');
var Light = require('./light');

var devices = {};

/**
 * Scan for bridges on the network.
 */
function scan() {
    hue.nupnpSearch()
        .then(function(bridges) {
            bridges.forEach(registerBridge);
        })
        .done();
}

/**
 * Register a bridge as a device.
 */
function registerBridge(data) {
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
                .fail(err => {
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

        device._remove();
        delete devices[data.id];
        clearInterval(lightInterval);

        scan();
    }

    let searchErrorCount = 0;
    function searchForLights() {
        api.lights()
            .then(function(registeredLights) {
                let found = {};

                // Update or create devices for all found lights
                registeredLights.lights.forEach(function(def) {
                    found[def.uniqueid] = true;
                    if(lights[def.uniqueid]) return;

                    lights[def.uniqueid] = new Light(api, def);
                });

                // Remove any lights no longer available
                Object.keys(lights).forEach(function(l) {
                    if(! found[l]) {
                        lights[l]._remove();
                        delete lights[l];
                    }
                });
            })
            .fail(function() {
                if(++searchErrorCount > 5) {
                    removeDevice();
                }
            })
            .done();
    }

    function status() {
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
            capabalities: [ 'config' ],
            name: 'Hue Bridge'
        },

        link: link,

        status: status
    });

    var stored = th.storage.get('hue:' + data.id);
    if(stored) {
        init(stored);
    }
}


// Start scanning for bridges
scan();
