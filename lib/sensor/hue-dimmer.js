'use strict';

const { RemoteControl } = require('abstract-things/controllers');
const Actions = require('./actions');

module.exports = class HueDimmer extends RemoteControl.with(Actions) {
	static get type() {
		return 'hue:dimmer';
	}

	constructor(bridge, def) {
		super(bridge, def);

		this.withButton('on', { id: 1, long: true });
		this.withButton('dimUp', { id: 2, long: true });
		this.withButton('dimDown', { id: 3, long: true });
		this.withButton('off', { id: 4, long: true });
	}
};
