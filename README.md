# tinkerhub-device-hue

Support for Philips Hue lights in [Tinkerhub](https://github.com/tinkerhub/tinkerhub).
This module supports both the Philips Hue bridge and the [deConz REST plugin](https://github.com/dresden-elektronik/deconz-rest-plugin).

* **Latest version**: 0.4.0
* **Status**: Mostly stable

## Installation and use

When running [tinkerhubd](https://github.com/tinkerhub/tinkerhub-daemon) install
via:

```
$ tinkerhubd install device-hue
```

Bridges found will have the type `hue:bridge`. You will need to link with the
bridge:

```
$ tinkerhub
> type:bridge:hue link
```

After running press the link button on the bridge or for deConz open the
bridge via the web interface.

After this lights and sensors should be made available with various types and
capabilities.

## Supported lights

Any light that you can connect to your bridge should be supported. These include:

* Philips Hue lights
* IKEA Trådfri lights (latest firmware - or using deConz)
* OSRAM Lightify lights and plugs
* Zigbee Light Links (ZLL) compatible lights and plugs

In addition deConz supports Zigbee Home Automation (ZHA) and Zigbee 3.0 lights
and plugs.

## Supported sensors

For the Hue bridge this is limited to the Hue motion sensor.

Using deConz the following sensors are supported:

* Xiaomi Aqara (Lumi) temperature and humidity sensor
* Xiaomi Aqara (Lumi) weather sensor (2017 model)
* Xiaomi Aqara (Lumi) motion sensor
* Xiaomi Aqara (Lumi) motion and illuminance sensor (2017 model)
* Xiaomi Aqara (Lumi) door and window sensor
* Xiaomi Aqara (Lumi) door and window sensor (2017 model)
* IKEA Trådfri motion sensor

## Supported controllers and remotes

Controllers on a Hue bridge will appear but will not be very useful due to
events being polled only once every five seconds.

deConz has a websocket connection and receives events as they occur. Supported
controllers:

* Hue Dimmer
* Hue Tap
* Xiaomi Aqara (Lumi) wireless switch
* Xiaomi Aqara (Lumi) wireless switch (2017 model)
* Xiaomi Aqara (Lumi) smart cube
* IKEA Trådfri remote
* IKEA Trådfri dimmer
