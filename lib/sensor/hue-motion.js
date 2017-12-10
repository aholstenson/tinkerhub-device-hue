'use strict';

const Motion = require('./motion');

module.exports = class HueMotion extends Motion {
	static get type() {
		return 'hue:hue-motion';
	}

	constructor(bridge, def) {
		super(bridge, def);
	}
};
