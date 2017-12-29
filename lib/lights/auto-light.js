'use strict';

const { Light, HueApi, Dimmable, Colorable, ColorTemperature } = require('./light');
const { Thing } = require('abstract-things');

const CustomColor = Thing.mixin(Parent => class extends Parent.with(Colorable, HueApi) {

	constructor(bridge, def) {
		super(bridge, def);

		this._colorInfo = {
			temperature: typeof def.state.ct !== 'undefined',
			hueSat: typeof def.state.xy !== 'undefined',
			xy: typeof def.state.hue !== 'undefined',

			temperatureRange: [ 153, 500 ]
		};

		if(this._colorInfo.hueSat || this._colorInfo.xy) {
			this.metadata.addCapabilities('color:full');
		}
	}
});

const DefaultLight = require('./generic-switchable');
const DimmableLight = require('./generic-dimmable');
const DimmableLightWithColor = Light.with(Dimmable, CustomColor);
const DimmableLightWithColorTemp = Light.with(Dimmable, CustomColor, ColorTemperature);
const ColorLight = Light.with(CustomColor);
const ColorLightWithTemp = Light.with(CustomColor, ColorTemperature);

module.exports = function(def) {

	const isDimmable = typeof def.state.bri !== 'undefined';
	const isColored = typeof def.state.hue !== 'undefined'
		|| typeof def.state.ct !== 'undefined'
		|| typeof def.state.xy !== 'undefined';

	const hasTemp = typeof def.state.ct !== 'undefined';

	if(isDimmable && isColored) {
		if(hasTemp) {
			return DimmableLightWithColorTemp;
		} else {
			return DimmableLightWithColor;
		}
	} else if(isDimmable) {
		return DimmableLight;
	} else if(isColored) {
		if(hasTemp) {
			return ColorLightWithTemp;
		} else {
			return ColorLight;
		}
	}

	return DefaultLight;
};
