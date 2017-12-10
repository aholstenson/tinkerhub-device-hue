'use strict';

const Motion = require('./motion');

module.exports = class LumiMotion extends Motion {
	static get type() {
		return 'hue:lumi-motion';
	}

	constructor(bridge, def) {
		super(bridge, def);
	}
};
