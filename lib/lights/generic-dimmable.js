'use strict';

const { Light, HueApi, Dimmable } = require('./light');

module.exports = Light.with(Dimmable, HueApi);
