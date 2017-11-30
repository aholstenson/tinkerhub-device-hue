'use strict';

const HueSensor = require('.');
const { Temperature } = require('appliances/sensor');

module.exports = class extends HueSensor.with(Temperature) {
	setExternalState(state) {
		super.setExternalState(state);

		this.updateTemperature(state.temperature / 100);
	}
};
