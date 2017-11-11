'use strict';

const { Light, Power, Dimmable, Color } = require('appliances/light');
const { color: colorValue } = require('appliances/values');

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Light abstraction for a light connected to the Hue.
 */
class HueLight extends Light.with(Power) {
	static get type() {
		return 'hue:light';
	}

    constructor(bridge, def) {
		super();

		this.id = def.id;

		this.bridge = bridge;

        this._def = def;

        this.metadata.name = def.name;

        this._supportsTemperature = typeof def.state.ct !== 'undefined';
        this._supportsXY = typeof def.state.xy !== 'undefined';
        this._supportsHue = typeof def.state.hue !== 'undefined';

        if(typeof def.state.bri !== 'undefined') {
			// This light is dimmable
			this.extendWith(Dimmable);
        }

        if(typeof def.state.hue !== 'undefined' || typeof def.state.ct !== 'undefined') {
			// This light supports colors
			this.extendWith(Color);

            if(this._supportsTemperature) {
                this.metadata.addCapabilities('color:temperature');
            }

            if(this._supportsXY || this._supportsHue) {
                this.metadata.addCapabilities('color:full');
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
                color = colorValue.xyY(state.xy[0], state.xy[1], brightness);
                break;
            case 'hs':
                color = colorValue.hsl(state.hue / 65535 * 360, state.sat / 255 * 100);
                break;
            case 'ct':
                color = colorValue.mired(state.ct).temperature;
                break;
		}

		if(color) {
			this.updateColor(color);
		}
	}

	_changeState(state) {
		return this.bridge._sendApiRequest({
			method: 'PUT',
			url: 'lights/' + this._def.internalId + '/state',
			data: state
		});
	}

	/**
     * Set the power on/off for this light.
     */
    changePower(power) {
        return this._changeState({ on: power })
			.then(() => this.updatePower(power));
    }

	/**
	 * Helper used when a light supports dimming.
	 *
	 * @param {*} brightness
	 * @param {*} duration
	 */
	changeBrightness(brightness, duration) {
		if(brightness === 0) {
			// Setting brightness to zero should power of the device
			return this._changeState({
				bri: 0,
				on: false,
				transitiontime: Math.round(duration.ms / 100)
			})
				.then(() => this.updateBrightness(brightness))
				.then(() => this.updatePower(false));
		}

		return this._changeState({
			bri: Math.round(brightness / 100 * 255),
			transitiontime: Math.round(duration.ms / 100)
		})
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

		let state = {
			transitiontime: Math.round(duration.ms / 100)
		};

		if(color.is('temperature')) {
			// TODO: Support clamping to ranges defined by the light
			const ct = clamp(color.mired.value, 154, 500);
			color = colorValue.mired(ct).temperature;
			this.debug('Requesting mired temp ' + color.mired.value + ', but setting ' + ct);
			state.ct = ct;
		} else if(color.is('xyY')) {
			state.xy = [ color.x, color.y ];
			color = colorValue.xyY(color.x, color.y, this.getState('brightness'));
		} else {
			state.hue = color.hue / 360 * 65535;
			state.sat = color.stat / 100 * 255;
		}

		return this._changeState(state)
			.then(() => this.updateColor(color));
	}
}

module.exports = HueLight;
