'use strict';

const Motion = require('./motion');

module.exports = class TradfriMotion extends Motion {
	static get type() {
		return 'hue:tradfri-motion';
	}

	constructor(bridge, def) {
		super(bridge, def);
	}
};
