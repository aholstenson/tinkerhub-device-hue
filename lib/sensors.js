'use strict';

/**
 * Picker for selecting the best sensor implementation for the given definition.
 */
module.exports = function(def) {
	if(def.type === 'ZLLSwitch' || def.type === 'ZHASwitch' || def.type === 'ZGPSwitch') {
		// Switches that are mapped to controller
		switch(def.modelid) {
			case 'RWL020':
			case 'RWL021':
				return require('./sensor/hue-dimmer');
			case 'lumi.sensor_switch':
			case 'lumi.sensor_switch.aq2':
				return require('./sensor/lumi-switch');
			case 'ZGPSWITCH':
				return require('./sensor/hue-tap');
		}
	} else if(def.type === 'ZLLTemperature' || def.type === 'ZHATemperature') {
		// Temperature sensors
		switch(def.modelid) {
			case 'lumi.sensor_ht':
			case 'lumi.weather':
				return require('./sensor/lumi-temperature');
		}
	} else if(def.type === 'ZLLHumidity' || def.type === 'ZHAHumidity') {
		// Humidity sensors
		switch(def.modelid) {
			case 'lumi.sensor_ht':
			case 'lumi.weather':
				return require('./sensor/lumi-humidity');
		}
	}
}
