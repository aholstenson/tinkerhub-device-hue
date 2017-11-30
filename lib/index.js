'use strict';

const th = require('tinkerhub');

const Bridge = require('./bridge');

const NupnpDiscovery = require('./nupnp');

const ssdp = require('tinkerhub-ssdp').browser('upnp:rootdevice')
	.filter(service => service.headers['HUE-BRIDGEID'])
	.map(service => {
		service.id = service.headers['HUE-BRIDGEID'].toLowerCase();
		return service;
	});

const nupnpHue = new NupnpDiscovery('https://www.meethue.com/api/nupnp');
const nupnpDeconz = new NupnpDiscovery('https://dresden-light.appspot.com/discover');

// Combine the discoveries into a single one
const discoveries = ssdp.and(nupnpHue).and(nupnpDeconz);

// Turn every bridge found into an appliance and register them
const bridges = discoveries.map(service => {
	const options = {
		id: service.id,
		url: service.location
	};

	return new Bridge(options).init();
});

th.registerDiscovery(bridges);
