# Philips Hue Lights

Support for Philips Hue lights in [Tinkerhub](https://github.com/tinkerhub/tinkerhub).
This will find any Hue bridges on your local network and make their lights
available through Tinkerhub.

To install this into your local Tinkerhub install use:

`npm install --save tinkerhub-device-hue`

If you use `th.autoload()` you only need to restart your installation and
bridges will be made available.

Lights will be made available after you have linked the bridge. You can do
this via the CLI:

```
$ tinkerhub
> type:hue-bridge link
 PROGRESS hue:idofbridgehere
  Press link button on Hue bridge
 SUCCESS hue.idofbridgehere
  status:  200
  message: Linked with bridge
```
