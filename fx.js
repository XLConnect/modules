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
	let lastRates = [null];

	// Pull the data from today's date; failing that, go back in time by one day and repeat.
	while (lastRates[0] == null) {
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

function get(date_s){

	// if no argument given (ie called as fx.get()), return last available rate from dl 
	if(date_s == null) return getLastValidRates().dat

	if(isArray(date_s)){
		// array od dates => array of rates 
		date_s.map((e, i) => { if(!isDate(e)) throw `Element ${i} is not a valid Date: ${e}`});
		const keys = date_s.map(d => d.toISOString().slice(0,10));
		const rates = getFXAtDate(keys);
		return rates.map(r => r.dat);
	}else{
		// single date => single rate
		if(!isDate(date_s)) throw ` ${date_s} is not a valid Date`
		const keys = [date_s.toISOString().slice(0,10)]
		const rates = getFXAtDate(keys)
		return rates[0].dat
	}
}

/**
 * 
 * @param {fx} fx 
 * @param {string} from 
 * @param {string} to 
 */
function convert(fx, from, to){
	
	let rates = fx.rates;	
	let f = rates[from];		
	let t = rates[to]	
		
	return t / f
}

function isDate(input) {
	if (Object.prototype.toString.call(input) === "[object Date]") return true;
	return false;
 };

 function isArray(input){
	return Array.isArray(input)
 }

// exports
exports.getFXRates = getFXRates;
exports.getLastValidRates = getLastValidRates;
exports.get = get;
exports.convert = convert;