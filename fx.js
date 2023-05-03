"use strict";

// import libs
var xero = require("xero.js");

/**
 * Get the FX rates given a number of periods and an end date.
 * @param {string} toDate
 * @param {number} numPeriods
 * @returns {Object} fxs
 */
function getFXRates(toDate, numPeriods) {
	const periods = xero.periods(toDate, numPeriods);
	const lastValid = getLastValidRates();
	let fxs = getFXAtDate(periods.map(p => p.toDate));
	for (let i = 0; i < fxs.length; i++) {
		if (!fxs[i]) {
			const copiedRates = {...lastValid};
			copiedRates.key = periods[i].toDate;
			fxs[i] = copiedRates;
		}
	}
	return fxs;
}

/**
 * Get the last valid FX rate from the server.
 * @returns {Object} lastRates
 */
function getLastValidRates() {
	// Start our search for valid FX rates from the present day.
	let lastKey = new Date();
	let lastRates = null;

	// Pull the data from today's date; failing that, go back in time by one day and repeat.
	while (lastRates == null) {
		lastRates = getFXAtDate([getKey(lastKey)]);
		lastKey.setDate(lastKey.getDate()-1);
	}
	return lastRates[0]; // We only want the FX object from the singleton array.
}

/**
 * Converts a Date object to a string used to access its corresponding FX data.
 * @param {Object} date
 * @returns {string} key 
 */
function getKey(date) {
	return `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}-${date.getUTCDate().toString().padStart(2, '0')}`
}

/**
 * Gets the FX data for an array of dates.
 * @param {array} keys
 * @returns {Object} FXobject
 */
function getFXAtDate(keys) {
	return JSON.parse(xlc.msgs('Public', 'gVAHG1', keys).Result);
}

// exports
exports.getFXRates = getFXRates;
exports.getLastValidRates = getLastValidRates;
