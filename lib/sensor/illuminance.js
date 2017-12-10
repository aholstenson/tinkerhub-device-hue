'use strict';

const { Appliance } = require('appliances');
const { Illuminance } = require('appliances/sensor');
const Sensor = require('./');

module.exports = Appliance.type(Parent => class extends Parent.with(Sensor, Illuminance) {
	constructor(bridge, def) {
		super(bridge, def);
	}

	setExternalState(state) {
		super.setExternalState(state);

		// Protect against duplicate events
		if(this.lastUpdated === state.lastupdated && this.lastLightLevel === state.lightlevel) return;

		// Keep track of the data in the state to ignore at next update
		this.lastLightLevel = state.lightlevel;
		this.lastUpdated = state.lastupdated;

		// Convert light level into lux
		let lx;
		if(state.lightlevel <= 0) {
			// No light level, assume it's dark
			lx = 0;
		} else {
			lx = Math.pow(10, (state.lightlevel - 1) / 10000);

			// Round it a bit
			lx = Math.round(lx * 10000) / 10000;

			// Clamp lux to 0...10000
			if(lx > 10000) {
				lx = 10000;
			} else if(lx <= 0) {
				lx = 0;
			}
		}

		this.updateIlluminance(lx);
	}
});
