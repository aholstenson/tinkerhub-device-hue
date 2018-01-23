'use strict';

const { Button } = require('abstract-things/controllers');
const Actions = require('./actions');

module.exports = class LumiSwitch extends Button.with(Actions) {
	static get type() {
		return 'hue:lumi-switch';
	}

	constructor(bridge, def) {
		super(bridge, def);

		this.withButton('main', { id: 1 });
	}
};
