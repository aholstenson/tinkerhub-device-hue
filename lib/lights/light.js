'use strict';

const { Appliance, Nameable } = require('appliances');
const { Light, SwitchablePower, Dimmable, Color } = require('appliances/light');
const { color: colorValue } = require('appliances/values');
const xyColor = require('./color');

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

module.exports.Light = Light;

/**
 * Light abstraction for a light connected to the Hue.
 */
module.exports.HueApi = Appliance.capability(Parent => class extends Parent.with(SwitchablePower, Nameable) {
	static get type() {
		return 'hue:light';
	}

	constructor(bridge, def) {
		super(bridge, def);

		this.id = def.id;

		this.bridge = bridge;

		this._def = def;
		this._colorInfo = {
			temperature: false,
			hueSat: false,
			xy: false
		};

		this.metadata.name = def.name;
	}

	setExternalState(state) {
		if(typeof state.on !== 'undefined') {
			this.updatePower(state.on);
		}

		let brightness = 0;
		if(typeof state.bri !== 'undefined' && this.updateBrightness) {
			brightness = Math.round(state.bri / 255 * 100);
			this.updateBrightness(brightness);
		}

		let color = null;
		switch(state.colormode) {
			case 'xy':
				if(state.xy) {
					color = xyColor.toColor(state.xy[0], state.xy[1], this._colorInfo.gamut);
				}
				break;
			case 'hs':
				if(typeof state.hue !== 'undefined') {
					color = colorValue.hsl(state.hue / 65535 * 360, state.sat / 255 * 100, this.state.brightness);
				}
				break;
			case 'ct':
				if(state.ct) {
					color = colorValue.mired(state.ct).temperature;
				} else if(state.xy) {
					color = xyColor.toColor(state.xy[0], state.xy[1], this._colorInfo.gamut).temperature;
				}
				break;
		}

		if(color && this.updateColor) {
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
				if(! this._colorInfo.temperature) {
					if(this._colorInfo.hueSat) {
						color = color.hsl;
					} else {
						color = xyColor.fromColor(color, this._colorInfo.gamut);
					}
				}
			} else {
				if(this._colorInfo.hueSat) {
					color = color.hsl;
				} else if(this._colorInfo.xy) {
					color = xyColor.fromColor(color, this._colorInfo.gamut);
				} else if(this._colorInfo.temperature) {
					color = color.temperature;
				} else {
					throw new Error('This light does not support any known color mode');
				}
			}

			// Set the color based on the type
			if(Array.isArray(color)) {
				// Resolved to xy
				mapped.xy = color;
				color = xyColor.toColor(color[0], color[0], this._colorInfo.gamut);
			} else if(color.is('temperature')) {
				const temperatureRange = this._colorInfo.temperatureRange;
				const ct = clamp(color.mired.value, temperatureRange[0], temperatureRange[1]);
				color = colorValue.mired(ct).temperature;
				mapped.ct = ct;
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

	changeName(name) {
		return this.bridge._sendApiRequest({
			method: 'PUT',
			url: 'lights/' + this._def.internalId,
			data: { name: name }
		}).then(() => this.metadata.name = name);
	}
});

module.exports.Dimmable = Appliance.capability(Parent => class extends Parent.with(Dimmable) {
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

});

module.exports.Color = Appliance.capability(Parent => class extends Parent.with(Color) {
	changeColor(color, duration) {
		return this.setLightState({
			color: color
		}, duration);
	}
});
