var th = require('tinkerhub');

var hue = require('node-hue-api');
var deepEqual = require('deep-equal');
var clone = require('clone');

var lightState = hue.lightState;

/**
 * Light abstraction for a light connected to the Hue.
 */
class Light {
    constructor(api, def) {
        this._def = def;
        this._api = api;

        this.metadata = {
            type: 'light',
            name: def.name
        };

        this._device = th.devices.register(
            'hue:' + def.uniqueid.replace(/\:/g, '').replace('-0b', ''),
            this
        );

        // Update the state of the light every 2 seconds
        this._updateState = this._updateState.bind(this);
        this._timer = setInterval(this._updateState, 2000 + Math.random() * 1000);
        setTimeout(this._updateState(), Math.random() * 500);
    }

    /**
     * Turn this light on.
     */
    turnOn() {
        const state = lightState.create();
        return this._api.setLightState(this._def.id, state.on())
            .then(this._switchState(state => state.on = true));
    }

    /**
     * Turn this light off.
     */
    turnOff() {
        const state = lightState.create();
        return this._api.setLightState(this._def.id, state.off())
            .then(this._switchState(state => state.on = false));
    }

    /**
     * Set the brightness of this light.
     */
    setBrightness(brightness) {
        const state = lightState.create();
        const b = parseFloat(brightness);
        return this._api.setLightState(this._def.id, state.brightness(b))
            .then(this._switchState(state => state.brightness = b));
    }

    /**
     * Increase the brightness of this light.
     */
    increaseBrightness(brightness) {
        this.setBrightness(Math.min(100, this.state.brightness + parseFloat(brightness)));
    }

    /**
     * Decrease the brightness of this light.
     */
    decreaseBrightness(brightness) {
        this.setBrightness(Math.max(0, this.state.brightness - parseFloat(brightness)));
    }

    _switchState(func) {
        return () => {
            const state = clone(this.state);
            func(state);
            if(! deepEqual(this.state, state)) {
                this.state = state;
                this._device.emit('state', state);
            }

            return state;
        };
    }

    /**
     * Update the state of this light by querying the Hue Bridge.
     */
    _updateState() {
        this._api.lightStatus(this._def.id)
            .then(status => {
                let state = {};
                state.on = status.state.on === true;
                if(status.state.bri) {
                    state.brightness = Math.round(status.state.bri / 255 * 100);
                }

                // Only update and emit event if needed
                const firstState = !this.state;
                if(! deepEqual(this.state, state)) {
                    this.state = state;

                    if(! firstState) {
                        this._device.emit('state', state);
                    }
                }
            })
            .fail(function(msg) {
            })
            .done();
    }

    /**
     * Remove this device.
     */
    _remove() {
        clearInterval(this._timer);
        this._device._remove();
    }
}

module.exports = Light;
