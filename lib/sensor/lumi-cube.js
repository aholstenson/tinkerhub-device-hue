'use strict';

const Sensor = require('.');
const { Controller, RemoteControl, Actions } = require('abstract-things/controllers');

const SIDES = [ 'side-one', 'side-two', 'side-three', 'side-four', 'side-five', 'side-six' ];
module.exports.Main = class CubeMain extends RemoteControl.with(Actions, Sensor) {
	static get type() {
		return 'hue:lumi-cube:main';
	}

	constructor(bridge, def) {
		super(bridge, def);

		const actions = [
			'wake',
			'shake',
			'slide',
			'double-tap',
			'flip'
		];

		for(const side of SIDES) {
			actions.push(side + '-slide');
			actions.push(side + '-double-tap');
			actions.push(side + '-flip');
		}

		this.updateActions(actions);
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

		if(id === 7) {
			// Action is for the entire cube
			if(button === 0) {
				this.emitAction('wake');
			} else if(button === 7) {
				this.emitAction('shake');
			}
		} else {
			// Action was for one of the sides

			const side = SIDES[id - 1];
			if(button === 0) {
				// Slide event
				this.emitAction('slide');
				this.emitAction(side + '-slide');
			} else if(button === id) {
				// When button equals the id the event represent a double tap
				this.emitAction('double-tap');
				this.emitAction(side + '-double-tap');
			} else {
				/*
				 * button represents the side that the cube was flipped from,
				 * but ignore that and just emit a flip event.
				 */
				this.emitAction('flip');
				this.emitAction(side +'-flip');
			}
		}
	}
};

module.exports.Rotation = class CubeRotation extends Controller.with(Actions, Sensor) {
	static get type() {
		return 'hue:lumi-cube:rotation';
	}

	constructor(bridge, def) {
		super(bridge, def);

		this.updateActions([
			'rotation',
			'rotation-left',
			'rotation-right'
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

		const rotation = state.buttonevent / 100;

		this.emitAction('rotation', rotation);
		if(rotation < 0) {
			this.emitAction('rotation-left', -rotation);
		} else {
			this.emitAction('rotation-right', rotation);
		}
	}
};
