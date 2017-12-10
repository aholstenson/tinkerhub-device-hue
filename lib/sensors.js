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
			case 'lumi.sensor_cube':
			{
				const cube = require('./sensor/lumi-cube');
				if(def.ep === 2) {
					return cube.Main;
				} else if(def.ep === 3) {
					return cube.Rotation;
				}
				break;
			}
			case 'ZGPSWITCH':
				return require('./sensor/hue-tap');
			case 'TRADFRI remote control':
				return require('./sensor/tradfri-remote');
			case 'TRADFRI wireless dimmer':
				return require('./sensor/tradfri-dimmer');
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
	} else if(def.type === 'ZLLPresence' || def.type === 'ZHAPresence') {
		// Presence sensors
		switch(def.modelid) {
			case 'lumi.sensor_motion':
			case 'lumi.sensor_motion.aq2':
				return require('./sensor/lumi-motion');
			case 'SML001':
				return require('./sensor/hue-motion');
			case 'TRADFRI motion sensor':
				return require('./sensor/tradfri-motion');
		}
	} else if(def.type === 'ZLLLightLevel' || def.type === 'ZHALightLevel') {
		// Light level - maps to illuminance sensor
		switch(def.modelid) {
			case 'lumi.sensor_motion.aq2':
				return require('./sensor/lumi-illuminance');
			case 'SML001':
				return require('./sensor/hue-illuminance');
		}
	}
}
