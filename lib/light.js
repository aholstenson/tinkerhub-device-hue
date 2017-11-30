'use strict';

const { Nameable } = require('appliances');
const { Light, Dimmable, Color, SwitchablePower } = require('appliances/light');
const { color: colorValue } = require('appliances/values');

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Light abstraction for a light connected to the Hue.
 */
class HueLight extends Light.with(SwitchablePower, Nameable) {
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
		if(typeof state.on !== 'undefined') {
			this.updatePower(state.on);
		}

		let brightness = 0;
		if(typeof state.bri !== 'undefined') {
			brightness = Math.round(state.bri / 255 * 100);
			this.updateBrightness(brightness);
        }

		let color = null;
        switch(state.colormode) {
			case 'xy':
				if(state.xy) {
					color = colorValue.xyY(state.xy[0], state.xy[1], brightness);
				}
                break;
			case 'hs':
				if(typeof state.hue !== 'undefined') {
					color = colorValue.hsl(state.hue / 65535 * 360, state.sat / 255 * 100);
				}
                break;
			case 'ct':
				if(state.ct) {
					color = colorValue.mired(state.ct).temperature;
				} else if(state.xy) {
					color = colorValue.xyY(state.xy[0], state.xy[1], brightness).temperature;
				}
                break;
		}

		if(color) {
			this.updateColor(color);
		}
	}

	setLightState(state, duration) {
		const mapped = {};

		// Update to the requested power state
		if(typeof state.power !== 'undefined') {
			mapped.on = state.power;
		}

		// Check if a specific brightness is being requested
		if(typeof state.brightness !== 'undefined') {
			if(state.brightness <= 0) {
				// Brightness of zero, also power off the light
				mapped.bri = 0;
				mapped.on = false;
			} else {
				// An actual brightness, set and power on
				mapped.bri = Math.round(state.brightness / 100 * 255);
				mapped.on = true;
			}
		}

		// Change the color
		if(typeof state.color !== 'undefined' && (mapped.on || this.state.power)) {
			let color = state.color;
			// Figure out how to set the color
			if(color.is('temperature')) {
				if(! this._supportsTemperature) {
					if(this._supportsHue) {
						color = color.hsl;
					} else {
						color = color.xyY;
					}
				}
			} else {
				if(this._supportsHue) {
					color = color.hsl;
				} else if(this._supportsXY) {
					color = color.xyY;
				} else if(this._supportsTemperature) {
					color = color.temperature;
				} else {
					throw new Error('This light does not support any known color mode');
				}
			}

			// Set the color based on the type
			if(color.is('temperature')) {
				// TODO: Support clamping to ranges defined by the light
				const ct = clamp(color.mired.value, 154, 500);
				color = colorValue.mired(ct).temperature;
				this.debug('Requesting mired temp ' + color.mired.value + ', but setting ' + ct);
				mapped.ct = ct;
			} else if(color.is('xyY')) {
				mapped.xy = [ color.x, color.y ];
				color = colorValue.xyY(color.x, color.y, this.getState('brightness'));
			} else {
				mapped.hue = color.hue / 360 * 65535;
				mapped.sat = color.saturation / 100 * 255;
			}
		}

		// Set the transition time
		if(! duration) {
			duration = Light.DURATION;
		}
		mapped.transitiontime = Math.round(duration.ms / 100);

		return this._changeState(mapped)
			.then(() => {
				// Pass in the changed state as an external one
				this.setExternalState(mapped);
			});
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
        return this.setLightState({
			power: power
		});
    }

	/**
	 * Helper used when a light supports dimming.
	 *
	 * @param {*} brightness
	 * @param {*} duration
	 */
	changeBrightness(brightness, duration) {
		return this.setLightState({
			brightness: brightness
		}, duration);
	}

	changeColor(color, duration) {
		return this.setLightState({
			color: color
		}, duration);
	}

	changeName(name) {
		return this.bridge._sendApiRequest({
			method: 'PUT',
			url: 'lights/' + this._def.internalId,
			data: { name: name }
		}).then(() => this.metadata.name = name);
	}
}

module.exports = HueLight;
