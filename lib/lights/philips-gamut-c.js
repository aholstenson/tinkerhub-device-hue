'use strict';

const { Light, HueApi, Dimmable, Color } = require('./light');

module.exports = class extends Light.with(Dimmable, Color, HueApi) {
	constructor(bridge, def) {
		super(bridge, def);

		this._colorInfo = {
			temperature: true,
			xy : true,
			hueSat: true,

			temperatureRange: [ 153, 500 ],
			gamut: {
				r: [ 0.6920, 0.3080 ],
				g: [ 0.1700, 0.7000 ],
				b: [ 0.1530, 0.0480 ]
			}
		}

		this.metadata.addCapabilities('color:temperature', 'color:full');
	}
};
