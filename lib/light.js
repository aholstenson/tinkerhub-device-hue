'use strict';

var th = require('tinkerhub');

var hue = require('node-hue-api');
var deepEqual = require('deep-equal');
var clone = require('clone');

var lightState = hue.lightState;

const requestInterval = 250;
let availableRequests = 2;
let queue = [];

function throttle() {
    return new Promise(resolve => {
        if(availableRequests > 0) {
            // We have less active requests than we can handle
            availableRequests--;
            resolve();

            setTimeout(() => {
                availableRequests++;

                let next = queue.pop();
                if(next) {
                    // Call ourselves to get a promise and run the resolve
                    throttle().then(next);
                }
            }, requestInterval);
        } else {
            // No available requests, queue it for later
            queue.push(resolve);
        }
    });
}

// The default time for transitions
const DURATION = th.values.duration('400 ms');

function extend(light, cap, def) {
    light.metadata.capabilities.push(cap);
    Object.keys(def).forEach(d => light[d] = def[d]);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Light abstraction for a light connected to the Hue.
 */
class Light {
    constructor(api, def) {
        this._def = def;
        this._api = api;

        this.metadata = {
            type: 'light',
            capabilities: [],
            name: def.name
        };

        this._supportsTemperature = typeof def.state.ct !== 'undefined';
        this._supportsXY = typeof def.state.xy !== 'undefined';
        this._supportsHue = typeof def.state.hue !== 'undefined';

        if(typeof def.state.bri !== 'undefined') {
            // This light is dimmable
            extend(this, 'dimmable', {
                brightness(brightness, duration) {
                    if(brightness) {
                        let toSet;
                        if(brightness.isIncrease) {
                            toSet = this.state.brightness + brightness.value;
                        } else if(brightness.isDecrease) {
                            toSet = this.state.brightness - brightness.value;
                        } else {
                            toSet = brightness.value;
                        }
                        return this.setBrightness(toSet, duration);
                    }

                    return this.state.brightness;
                },

                /**
                 * Set the brightness of this light.
                 */
                setBrightness(brightness, duration) {
                    duration = duration || DURATION;

                    const state = lightState.create()
                        .transition(duration.ms);

                    return throttle()
                        .then(() => this._api.setLightState(this._def.id, state.brightness(brightness)))
                        .then(this._switchState(state => state.brightness = brightness))
                        .then(() => brightness);
                },

                /**
                 * Increase the brightness of this light.
                 */
                increaseBrightness(brightness, duration) {
                    return this.setBrightness(Math.min(100, this.state.brightness + brightness), duration);
                },

                /**
                 * Decrease the brightness of this light.
                 */
                decreaseBrightness(brightness, duration) {
                    return this.setBrightness(Math.max(0, this.state.brightness - brightness), duration);
                }
            });
        }

        if(typeof def.state.hue !== 'undefined' || typeof def.state.ct !== 'undefined') {
            // This light supports colors
            extend(this, 'color', {
                color(color, duration) {
                    if(color) {
                        return this.setColor(color, duration);
                    }

                    return this.state.color;
                },

                setColor(color, duration) {
                    duration = duration || DURATION;

                    if(! color) throw new Error('Color is required');

                    if(! this.state.power) {
                        // Light is not turned on, can not switch color
                        return this.state;
                    }

                    // Figure out best way to change color
                    if(color.is('temperature')) {
                        if(! this._supportsTemperature) {
                            if(this._supportsXY) {
                                color = color.xyY;
                            } else {
                                color = color.hsl;
                            }
                        }
                    } else {
                        if(this._supportsXY) {
                            color = color.xyY;
                        } else if(this._supportsHue) {
                            color = color.hsl;
                        } else if(this._supportsTemperature) {
                            color = color.temperature;
                        } else {
                            throw new Error('This light does not support any known color mode');
                        }
                    }

                    let ls = lightState.create()
                        .transition(duration.ms);
                    if(color.is('temperature')) {
                        // TODO: Support clamping to ranges defined by the light
                        const ct = clamp(color.mired.value, 154, 500);
                        color = th.values.color.mired(ct).temperature;
                        this._device.debug('Requesting mired temp ' + color.mired.value + ', but setting ' + ct);
                        ls = ls.ct(ct);
                    } else if(color.is('xyY')) {
                        ls = ls.xy(color.x, color.y);
                        color = th.values.color.xyY(color.x, color.y, this.state.brightness);
                    } else {
                        ls = ls.hue(color.hue / 360 * 65535)
                            .sat(color.sat / 100 * 255);
                    }

                    return throttle()
                        .then(() => this._api.setLightState(this._def.id, ls))
                        .then(this._switchState(state => state.color = color))
                        .then(() => color);
                }
            });

            if(this._supportsTemperature) {
                this.metadata.capabilities.push('color:temperature');
            }

            if(this._supportsXY || this._supportsHue) {
                this.metadata.capabilities.push('color:full');
            }
        }

        this.state = this._createState(def.state);

        this._device = th.devices.register(
            'hue:' + def.uniqueid.replace(/\:/g, '').replace('-0b', ''),
            this
        );
        this._device.debug('Light def is ', def);
    }

    _createState(hueState) {
        let state = {};
        state.power = hueState.on === true;
        if(typeof hueState.bri !== 'undefined') {
            state.brightness = Math.round(hueState.bri / 255 * 100);
        }

        switch(hueState.colormode) {
            case 'xy':
                state.color = th.values.color.xyY(hueState.xy[0], hueState.xy[1], state.brightness);
                break;
            case 'hs':
                state.color = th.values.color.hsl(hueState.hue / 65535 * 360, hueState.sat / 255 * 100);
                break;
            case 'ct':
                state.color = th.values.color.mired(hueState.ct).temperature;
                break;
        }

        return state;
    }

    power(on) {
        if(typeof on !== 'undefined') {
            return this.setPower(on);
        }
        return this.state.power;
    }

    /**
     * Turn this light on.
     */
    turnOn() {
        const state = lightState.create();
        return throttle()
            .then(() => this._api.setLightState(this._def.id, state.on()))
            .then(this._switchState(state => state.power = true))
            .then(() => true);
    }

    /**
     * Turn this light off.
     */
    turnOff() {
        const state = lightState.create();
        return throttle()
            .then(() => this._api.setLightState(this._def.id, state.off()))
            .then(this._switchState(state => state.power = false))
            .then(() => false);
    }

    /**
     * Set the power on/off for this light.
     */
    setPower(power) {
        if(power) {
            return this.turnOn();
        } else {
            return this.turnOff();
        }
    }

    _setState(state) {
        if(! deepEqual(this.state, state)) {
            this._device.emit('state', state);

            if(this.state.power !== state.power) {
                this._device.emit('power', state.power);
            }

            if(this.state.brightness !== state.brightness) {
                this._device.emit('light:brightness', state.brightness);
            }

            if(! deepEqual(this.state.color, state.color)) {
                this._device.emit('light:color', state.color);
            }

            this.state = state;
        }
    }

    _switchState(func) {
        return () => {
            const state = clone(this.state);
            func(state);
            this._setState(state);

            return state;
        };
    }

    /**
     * Update the state of this light by querying the Hue Bridge.
     */
    _updateState(state) {
        this._setState(this._createState(state));
    }

    /**
     * Remove this device.
     */
    _remove() {
        this._device._remove();
    }
}

module.exports = Light;
