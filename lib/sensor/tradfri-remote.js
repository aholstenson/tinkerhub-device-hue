'use strict';

const Controller = require('./controller');

module.exports = class TradfriRemote extends Controller {
	static get type() {
		return 'hue:tradfri-remote';
	}

	constructor(bridge, def) {
		super(bridge, def);

		this.withButton('onOff', { id: 1, long: false });
		this.withButton('dimUp', { id: 2, long: false });
		this.withButton('dimDown', { id: 3, long: false });
		this.withButton('previous', { id: 4, long: false });
		this.withButton('next', { id: 5, long: false });
	}
};
