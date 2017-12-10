'use strict';

const { Light, HueApi, Dimmable, Color } = require('./light');

module.exports = class extends Light.with(Dimmable, Color, HueApi) {
	constructor(bridge, def) {
		super(bridge, def);

		this._colorInfo = {
			temperature: true,
			xy: true,
			hueSat: true,

			temperatureRange: [ 250, 454 ],
		}

		this.metadata.addCapabilities('color:temperature');
		this.metadata.addCapabilities('color:full');
	}
};
