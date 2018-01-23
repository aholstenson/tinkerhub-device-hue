'use strict';

const { RemoteControl } = require('abstract-things/controllers');
const Actions = require('./actions');

module.exports = class TradfriDimmer extends RemoteControl.with(Actions) {
	static get type() {
		return 'hue:tradfri-dimmer';
	}

	constructor(bridge, def) {
		super(bridge, def);

		this.withButton('on', { id: 1, long: false });
		this.withButton('dimUp', { id: 2, long: false });
		this.withButton('dimDown', { id: 3, long: false });
		this.withButton('off', { id: 4, long: false });
	}
};
