"use strict";

function parseExcelDate(dateNumber){
    // parse an Excel date number like 45132 to a js Date object
    return new Date(Date.UTC(0, 0, dateNumber - 1));
}

function toExcelDate(jsDate){    
    // cast a js Date object to an Excel date number like 45132
    return Math.floor((jsDate - new Date('1899-12-30')) / 86400000);
}

function parseUnixDate(unixTimestamp) {
    // parse a Unix timestamp number like 1690243200 to a js date object 
    return new Date(unixTimestamp * 1000);
}

function toUnixDate(jsDate){
    // cast a js dat object to a Unix timestamp number like 1690243200
    return Math.floor(jsDate.getTime() / 1000);
}

function isoDate(year, month, day){
    // create a ISO date string like "2023-07-25" from a js date object
	return new Date(Date.UTC(year,month-1, day)).toISOString().slice(0,10)
}

exports.parseExcelDate = parseExcelDate;
exports.toExcelDate = toExcelDate;
exports.parseUnixDate = parseUnixDate;
exports.toUnixDate =toUnixDate;
exports.isoDate = isoDate;
