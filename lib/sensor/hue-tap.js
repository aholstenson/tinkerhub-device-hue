'use strict';

const Sensor = require('.');

module.exports = class HueTap extends Sensor {
	static get types() {
		return [ 'hue:tap', 'controller' ];
	}

	constructor(bridge, def) {
		super(bridge, def);
	}

	actionInvoked(id) {
		this.emitEvent('action', id);
		this.emitEvent('action:' + id);
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
				this.actionInvoked('one-click');
				break;
			case 16:
				this.actionInvoked('two-click');
				break;
			case 17:
				this.actionInvoked('three-click');
				break;
			case 18:
				this.actionInvoked('four-click');
				break;
		}
	}
};
