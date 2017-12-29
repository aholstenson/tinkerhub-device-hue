'use strict';

const { Thing } = require('abstract-things');
const { Controller } = require('abstract-things/controllers');
const Sensor = require('./');

module.exports = Thing.type(Parent => class extends Parent.with(Sensor, Controller) {
	constructor(bridge, def) {
		super(bridge, def);

		this._actions = [];
		this.buttons = new Map();
	}

	withButton(id, opts) {
		this.buttons.set(opts.id, id);
		this._actions.push(id + '-click');
		if(opts.long) {
			this._actions.push(id + '-long-press');
			this._actions.push(id + '-long-release');
		}

		this.updateActions(this._actions);
	}

	actionInvoked(id) {
		this.emitAction(id);
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

		const id = Math.floor(state.buttonevent / 1000);
		const button = state.buttonevent % 1000;

		const mappedTo = this.buttons.get(id);
		if(! mappedTo) return;

		switch(button) {
			case 0:
				// Button has been pressed down, ignore mapping it
				break;
			case 1:
				// Button long press
				this.actionInvoked(mappedTo + '-long-click');
				break;
			case 2:
				// Button single click release
				this.actionInvoked(mappedTo + '-click');
				break;
			case 3:
				this.actionInvoked(mappedTo + '-long-release');
				break;
		}
	}
});
