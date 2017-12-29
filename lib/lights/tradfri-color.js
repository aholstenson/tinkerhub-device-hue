'use strict';

const { Light, HueApi, Dimmable, Colorable, ColorTemperature, ColorFull } = require('./light');

module.exports = class extends Light.with(Dimmable, Colorable, ColorTemperature, ColorFull, HueApi) {
	constructor(bridge, def) {
		super(bridge, def);

		this._colorInfo = {
			temperature: true,
			xy: true,
			hueSat: true,

			temperatureRange: [ 250, 454 ],
		}
	}
};
