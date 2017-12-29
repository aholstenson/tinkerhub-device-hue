'use strict';

const HueSensor = require('.');
const { RelativeHumidity } = require('abstract-things/sensors');

module.exports = class extends HueSensor.with(RelativeHumidity) {
	static get type() {
		return 'hue:lumi-humidity';
	}

	setExternalState(state) {
		super.setExternalState(state);

		this.updateRelativeHumidity(state.humidity / 100);
	}
};
