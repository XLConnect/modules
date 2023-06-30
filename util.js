"use strict";

function parseExcelDate(dateNumber){
    return new Date(Date.UTC(0, 0, dateNumber - 1));
}

function parseUnixDate(unixTimestamp) {
    return new Date(unixTimestamp * 1000);
}

function isoDate(year, month, day){
	return new Date(Date.UTC(year,month-1, day)).toISOString().slice(0,10)
}

exports.parseExcelDate = parseExcelDate;
exports.parseUnixDate = parseUnixDate;
exports.isoDate = isoDate;
