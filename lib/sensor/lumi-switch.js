'use strict';

const Controller = require('./controller');

module.exports = class LumiSwitch extends Controller {
	static get type() {
		return 'hue:lumi-switch';
	}

	constructor(bridge, def) {
		super(bridge, def);

		this.withButton('main', { id: 1 });
	}
};
