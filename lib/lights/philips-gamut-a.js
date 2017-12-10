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
				r: [ 0.7040, 0.2960 ],
				g: [ 0.2151, 0.7106 ],
				b: [ 0.1380, 0.0800 ]
			}
		}

		this.metadata.addCapabilities('color:temperature', 'color:full');
	}
};
