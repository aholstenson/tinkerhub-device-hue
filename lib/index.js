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

const nupnp = new NupnpDiscovery();

// Turn every bridge found into an appliance and register them
const bridges = ssdp.and(nupnp).map(service => {
	const options = {
		id: service.id,
		url: service.location
	};

	return new Bridge(options).initialize();
});

th.register(bridges);
