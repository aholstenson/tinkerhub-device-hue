'use strict';

const { Light, HueApi, Dimmable, Color } = require('./light');
const { Appliance } = require('appliances');

const CustomColor = Appliance.capability(Parent => class extends Parent.with(Color, HueApi) {

	constructor(bridge, def) {
		super(bridge, def);

		this._colorInfo = {
			temperature: typeof def.state.ct !== 'undefined',
			hueSat: typeof def.state.xy !== 'undefined',
			xy: typeof def.state.hue !== 'undefined',

			temperatureRange: [ 153, 500 ]
		};

		if(this._colorInfo.temperature) {
			this.metadata.addCapabilities('color:temperature');
		}

		if(this._colorInfo.hueSat || this._colorInfo.xy) {
			this.metadata.addCapabilities('color:full');
		}
	}
});

const DefaultLight = require('./generic-switchable');
const DimmableLight = require('./generic-dimmable');
const DimmableLightWithColor = Light.with(Dimmable, CustomColor);
const ColorLight = Light.with(CustomColor);

module.exports = function(def) {

	const isDimmable = typeof def.state.bri !== 'undefined';
	const isColored = typeof def.state.hue !== 'undefined'
		|| typeof def.state.ct !== 'undefined'
		|| typeof def.state.xy !== 'undefined';

	if(isDimmable && isColored) {
		return DimmableLightWithColor;
	} else if(isDimmable) {
		return DimmableLight;
	} else if(isColored) {
		return ColorLight;
	}

	return DefaultLight;
};
