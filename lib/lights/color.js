'use strict';
/*
 * Color conversion extensions for the CIE xy space used by Hue. This supports
 * conversions with the gamuts used by the different lights.
 *
 * CIE xy is color based and an absolute scale. When conversions occur we
 * assume that sRGB is used.
 */

const { color } = require('appliances/values');
const findBestXY = require('./color-findBestXY');

/*
 * Do a rescale of R, G, B values so that if any of them are over 1.0 it is
 * clamped to 1.0 and the others values rescaled.
 */
function rescale(r, g, b) {
	if(r > g && r > b && r > 1.0) {
		return [ 1.0, g / r, b / r ];
	} else if(g > r && g > b && g > 1.0) {
		return [ r / g, 1.0, b / g ];
	} else if(b > r && b > g && b > 1.0) {
		return [ r / b, g / b, 1.0 ];
	}

	return [ r, g, b ];
}

module.exports.toColor = function(x, y, gamut) {
	// Figure out the closest XY-points in the given gamut
	if(gamut) {
		[ x, y ] = findBestXY(x, y, gamut);
	}

	const z = 1 - x - y;

	const Y = 1.0;
	const X = (Y / y) * x;
	const Z = (Y / y) * z;

	// Calculate initial r, g and b between 0 and 1
	let r = X *  1.656492 + Y * -0.354851 + Z * -0.255038;
	let g = X * -0.707196 + Y *  1.655397 + Z *  0.036152;
	let b = X * 0.051713 + Y * -0.121364 + Z * 1.011530;

	// Make sure that no values are outside the bounds, rescaling if needed
	[ r, g, b ] = rescale(r, g, b);

	// Perform reverse gamma correction according to sRGB
	r = r > 0.0031308 ? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055) : r * 12.92;
	g = g > 0.0031308 ? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055) : g * 12.92;
	b = b > 0.0031308 ? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055) : b * 12.92;

	// Make sure that no values are outside the bounds, rescaling if needed
	[ r, g, b ] = rescale(r, g, b);

	return color.rgb(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
};

module.exports.fromColor = function(color, gamut) {
	const rgb = color.rgb;

	const r = rgb.red > 0.04045 ? Math.pow((rgb.red + 0.055) / (1.0 + 0.055), 2.4) : (rgb.red / 12.92);
    const g = rgb.green > 0.04045 ? Math.pow((rgb.green + 0.055) / (1.0 + 0.055), 2.4) : (rgb.green / 12.92);
    const b = rgb.blue > 0.04045 ? Math.pow((rgb.blue + 0.055) / (1.0 + 0.055), 2.4) : (rgb.blue / 12.92);

	const X = r * 0.664511 + g * 0.154324 + b * 0.162028;
	const Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
    const Z = r * 0.000088 + g * 0.072310 + b * 0.986039;

	const s = X + Y + Z;
    const x = s == 0 ? 0 : X / s;
	const y = s == 0 ? 0 : Y / s;

	return findBestXY(x, y, gamut);
};
