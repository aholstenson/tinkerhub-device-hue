'use strict';

const DEFAULT_GAMUT = {
	r: [ 1, 0 ],
	g: [ 0, 1 ],
	b: [ 0, 0 ]
};

/*
 * Utility for finding the best X and Y using a certain gamut.
 *
 * Reference:
 * http://www.developers.meethue.com/documentation/color-conversions-rgb-xy
 *
 */
module.exports = function(x, y, gamut) {
	// If no gamut, set it to the default
	if(! gamut) gamut = DEFAULT_GAMUT;

	// Quick check if the color is within the requested gamut
	if(withinGamut(x, y, gamut)) {
		return [ x, y ];
	}

	let p = [ x, y ];
	const pRG = closestPointsToPoint(gamut.r, gamut.g, p);
	const pGB = closestPointsToPoint(gamut.g, gamut.b, p);
	const pBR = closestPointsToPoint(gamut.b, gamut.r, p);
	const dRG = distance(p, pRG);
	const dGB = distance(p, pGB);
	const dBR = distance(p, pBR);

	let best = dRG;
	p = pRG;

	if(dGB < best) {
		best = dGB;
		p = pGB;
	}

	if(dBR < best) {
		p = pBR;
	}

	return p;
};

function crossProduct(x1, y1, x2, y2) {
	return x1 * y2 - y1 * x2;
}

function withinGamut(x, y, gamut) {
	const r = gamut.r;
	const g = gamut.g;
	const b = gamut.b;

	const v1X = g[0] - r[0];
	const v1Y = g[1] - r[1];
	const v2X = b[0] - r[0];
	const v2Y = b[1] - r[1];
	const qX = x - r[0];
	const qY = y - r[1];

	const d = crossProduct(v1X, v1Y, v2X, v2Y);
	const s = crossProduct(qX, qY, v2X, v2Y) / d;
	const t = crossProduct(v1X, v1Y, qX, qY) / d;

	return s >= 0 && t >= 0 && s + t <= 1;
}

function closestPointsToPoint(a, b, p) {
	const apX = p[0] - a[0];
	const apY = p[1] - a[1];
	const abX = b[0] - a[0];
	const abY = b[1] - a[1];

	let t = (apX * abX + apY * abY) / (abX * abX + abY * abY);
	t = Math.max(Math.min(t, 1), 0);

	return [
		a[0] + abX * t,
		a[1] + abY * t
	];
}

function distance(a, b) {
	const dX = a[0] - b[0];
	const dY = a[1] - b[1];
	return dX * dX + dY * dY;
}
