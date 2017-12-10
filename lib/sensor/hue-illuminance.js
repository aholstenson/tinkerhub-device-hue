'use strict';

const Illuminance = require('./illuminance');

module.exports = class extends Illuminance {
	static get type() {
		return 'hue:hue-illuminance';
	}
};
