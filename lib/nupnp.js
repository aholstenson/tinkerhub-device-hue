'use strict';

const { TimedDiscovery, setServices, search, debug } = require('tinkerhub-discovery');
const axios = require('axios');

/**
 * Uses the Philiphs Hue remote discovery which can be faster to respond than
 * the SSDP discovery. Removes any bridge that hasn't been seen for an hour.
 */
module.exports = class NupnpDiscovery extends TimedDiscovery {
	static get type() {
		return 'nupnp';
	}

	constructor(endpoint) {
		super({ maxStaleTime: 60 * 60 * 1000 })

		this.endpoint = endpoint;
	}

	[search]() {
		axios.request({
			method: 'get',
			url: this.endpoint,

			timeout: 5000
		})
			.then(response => {
				const services = response.data.map(d => {
					const p = d.internalport ? ':' + d.internalport : '';
					return {
						id: d.id,
						location: 'http://' + d.internalipaddress + p + '/'
					}
				});

				this[setServices](services);
			})
			.catch(err => {
				this[debug]('Could not load Hue bridges;', err.message);
			});
	}
};
