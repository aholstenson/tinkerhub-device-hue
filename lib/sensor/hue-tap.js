'use strict';

const Sensor = require('.');
const { Controller } = require('abstract-things/controllers');

module.exports = class HueTap extends Controller.with(Sensor) {
	static get type() {
		return 'hue:tap';
	}

	constructor(bridge, def) {
		super(bridge, def);

		this.updateActions([
			'one-click',
			'two-click',
			'three-click',
			'four-click'
		]);
	}

	setExternalState(state) {
		super.setExternalState(state);

		// Check that we are handling button event
		if(! state.buttonevent) return;

		// Protect against duplicate events
		if(this.lastUpdated === state.lastupdated && this.lastButtonEvent === state.buttonevent) return;

		const isFirst = ! this.lastUpdated;

		// Keep track of the data in the state to ignore at next update
		this.lastButtonEvent = state.buttonevent;
		this.lastUpdated = state.lastupdated;

		// If this was the intial state skip emitting events
		if(isFirst) return;

		switch(state.buttonevent) {
			case 34:
				// Button has been pressed down, ignore mapping it
				this.emitAction('one-click');
				break;
			case 16:
				this.emitAction('two-click');
				break;
			case 17:
				this.emitAction('three-click');
				break;
			case 18:
				this.emitAction('four-click');
				break;
		}
	}
};
