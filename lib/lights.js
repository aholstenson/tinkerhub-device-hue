'use strict';

const autoLight = require('./lights/auto-light');

/**
 * Picker for selecting the best light implementation for the given definition.
 */
module.exports = function(def) {
	switch(def.modelid) {
		case 'LLC005':
		case 'LLC006':
		case 'LLC007':
		case 'LLC010':
		case 'LLC011':
		case 'LLC012':
		case 'LLC013':
		case 'LLC014':
		case 'LST001':
			return require('./lights/philips-gamut-a');
		case 'LCT001':
		case 'LCT002':
		case 'LCT003':
		case 'LCT007':
		case 'LLM001':
			return require('./lights/philips-gamut-b');
		case 'LCT010':
		case 'LCT011':
		case 'LCT012':
		case 'LCT014':
		case 'LCT015':
		case 'LCT016':
		case 'LLC020':
		case 'LST002':
			return require('./lights/philips-gamut-c');
		case 'LDT001':
		case 'LFF001':
		case 'LLM010':
		case 'LLM011':
		case 'LLM012':
		case 'LTC001':
		case 'LTC002':
		case 'LTC003':
		case 'LTC004':
		case 'LTD001':
		case 'LTD002':
		case 'LTD003':
		case 'LTF001':
		case 'LTF002':
		case 'LTP001':
		case 'LTP002':
		case 'LTP003':
		case 'LTP004':
		case 'LTP005':
		case 'LTT001':
		case 'LTW001':
		case 'LTW004':
		case 'LTW010':
		case 'LTW011':
		case 'LTW012':
		case 'LTW013':
		case 'LTW014':
			return require('./lights/philips-temperature');
		case 'LWT001':
		case 'LDD001':
		case 'LDF001':
		case 'LDF002':
		case 'LWB001':
		case 'LWB004':
		case 'LWB006':
		case 'LWB007':
		case 'LWB010':
		case 'LWB014':
		case 'MWM001':
			return require('./lights/generic-dimmable');

		case 'FLOALT panel WS 30x30':
		case 'FLOALT panel WS 30x90':
		case 'FLOALT panel WS 70x60':
		case 'TRADFRI bulb E14 WS opal 400lm':
		case 'TRADFRI bulb GU10 WS 400lm':
		case 'TRADFRI bulb GU10 W 400lm':
		case 'TRADFRI bulb E27 opal 1000lm':
		case 'TRADFRI bulb E27 WS opal 980lm':
		case 'TRADFRI bulb E27 W opal 1000lm':
			return require('./lights/tradfri-temperature');
		case 'TRADFRI bulb E27 CWS opal 600lm':
			return require('./lights/tradfri-color');

		case 'Plug 01':
		case 'Plug - LIGHTIFY':
			return require('./lights/generic-switchable');
	}


	// Fallback to guessing about the light
	return autoLight(def);
};
