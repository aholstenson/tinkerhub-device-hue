'use strict';

const { Light, HueApi, Dimmable, Colorable, ColorTemperature } = require('./light');

module.exports = class extends Light.with(Dimmable, Colorable, ColorTemperature, HueApi) {
	constructor(bridge, def) {
		super(bridge, def);

		this._colorInfo = {
			temperature: true,
			xy: false,
			hueSat: false,

			temperatureRange: [ 153, 454 ],
		}
	}
};
