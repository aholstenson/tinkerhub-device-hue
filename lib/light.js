'use strict';

const th = require('tinkerhub');
const { Light, Dimmable, Color } = require('tinkerhub/devices/light');

const hue = require('node-hue-api');
const lightState = hue.lightState;

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

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Light abstraction for a light connected to the Hue.
 */
class HueLight extends Light {
	static get types() {
		return [ 'hue-light', 'light' ];
	}

    constructor(api, def) {
		super();

		this.id = 'hue:' + def.uniqueid.replace(/\:/g, '').replace('-0b', '');

        this._def = def;
        this._api = api;

        this.metadata.name = def.name;

        this._supportsTemperature = typeof def.state.ct !== 'undefined';
        this._supportsXY = typeof def.state.xy !== 'undefined';
        this._supportsHue = typeof def.state.hue !== 'undefined';

        if(typeof def.state.bri !== 'undefined') {
			// This light is dimmable
			this.mixin(Dimmable);
        }

        if(typeof def.state.hue !== 'undefined' || typeof def.state.ct !== 'undefined') {
			// This light supports colors
			this.mixin(Color);

            if(this._supportsTemperature) {
                this.metadata.capability('color:temperature');
            }

            if(this._supportsXY || this._supportsHue) {
                this.metadata.capability('color:full');
            }
        }

        this.setExternalState(def.state);
    }

    setExternalState(state) {
		this.updatePower(state.on);

		let brightness = 0;
		if(typeof state.bri !== 'undefined') {
			brightness = Math.round(state.bri / 255 * 100);
			this.updateBrightness(brightness);
        }

		let color = null;
        switch(state.colormode) {
            case 'xy':
                color = th.values.color.xyY(state.xy[0], state.xy[1], brightness);
                break;
            case 'hs':
                color = th.values.color.hsl(state.hue / 65535 * 360, state.sat / 255 * 100);
                break;
            case 'ct':
                color = th.values.color.mired(state.ct).temperature;
                break;
		}

		if(color) {
			this.updateColor(color);
		}
	}

	/**
     * Set the power on/off for this light.
     */
    changePower(power) {
		let state = lightState.create();

		state = power ? state.on() : state.off();
        return throttle()
            .then(() => this._api.setLightState(this._def.id, state))
            .then(() => this.updatePower(power));
    }

	/**
	 * Helper used when a light supports dimming.
	 *
	 * @param {*} brightness
	 * @param {*} duration
	 */
	changeBrightness(brightness, duration) {
		const state = lightState.create()
			.transition(duration.ms);

		return throttle()
			.then(() => this._api.setLightState(this._def.id, state.brightness(brightness)))
			.then(() => this.updateBrightness(brightness));
	}

	changeColor(color, duration) {
		const hasPower = this.getState('power');
		if(! hasPower) {
			// Light is not turned on, can not switch color
			return;
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
			this.debug('Requesting mired temp ' + color.mired.value + ', but setting ' + ct);
			ls = ls.ct(ct);
		} else if(color.is('xyY')) {
			ls = ls.xy(color.x, color.y);
			color = th.values.color.xyY(color.x, color.y, this.getState('brightness'));
		} else {
			ls = ls.hue(color.hue / 360 * 65535)
				.sat(color.sat / 100 * 255);
		}

		return throttle()
			.then(() => this._api.setLightState(this._def.id, ls))
			.then(() => this.updateColor(color));
	}
}

module.exports = HueLight;
