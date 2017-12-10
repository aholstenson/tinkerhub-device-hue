'use strict';

const { Light, HueApi } = require('./light');

module.exports = Light.with(HueApi);
