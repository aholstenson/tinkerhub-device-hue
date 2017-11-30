# tinkerhub-device-hue

Support for Philips Hue lights in [Tinkerhub](https://github.com/tinkerhub/tinkerhub).
This module supports both the Philips Hue bridge and the [deConz REST plugin](https://github.com/dresden-elektronik/deconz-rest-plugin).

* **Latest version**: 0.3.0
* **Status**: Mostly stable, some sensors are not supported.

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
