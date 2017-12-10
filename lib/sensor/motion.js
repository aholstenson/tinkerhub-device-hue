'use strict';

const { Appliance } = require('appliances');
const { Motion } = require('appliances/sensor');
const Sensor = require('./');

module.exports = Appliance.type(Parent => class extends Parent.with(Sensor, Motion) {
	constructor(bridge, def) {
		super(bridge, def);
	}

	setExternalState(state) {
		super.setExternalState(state);

		// Protect against duplicate events
		if(this.lastUpdated === state.lastupdated && this.lastPresence === state.presence) return;

		// Keep track of the data in the state to ignore at next update
		this.lastPresence = state.presence;
		this.lastUpdated = state.lastupdated;

		// Update the motion
		this.updateMotion(state.presence);
	}
});
