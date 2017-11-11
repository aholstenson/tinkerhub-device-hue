'use strict';

const { TimedDiscovery, setServices, search, debug } = require('tinkerhub-discovery');
const axios = require('axios');

/**
 * Uses the Philiphs Hue remote discovery which can be faster to respond than
 * the SSDP discovery. Removes any bridge that hasn't been seen for an hour.
 */
module.exports = class NupnpDiscovery extends TimedDiscovery {
	get type() {
		return 'nupnp';
	}

	constructor() {
		super({ maxStaleTime: 60 * 60 * 1000 })
	}

	[search]() {
		axios.request({
			method: 'GET',
			url: 'https://www.meethue.com/api/nupnp',
			responseType: 'json'
		})
			.then(response => {
				const services = response.data.map(d => ({
					id: d.id,
					location: 'http://' + d.internalipaddress + '/'
				}));

				this[setServices](services);
			})
			.catch(err => {
				this[debug]('Could not load Hue bridges;', err.message);
			});
	}
};
