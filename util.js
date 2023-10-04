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

function parseAnyDate(date){
    // parse a date wether it is a string, Excel date number or Unix timestamp
    if (typeof date === 'string'){  
        return new Date(date);
    } else if (typeof date === 'number'){        
        return parseExcelDate(date);        
    } else if (date instanceof Date){
        return date;
    }
}

function endOfMonth(startDate, months) {

    // Parse the start date
    const jsDate = parseAnyDate(startDate);
  
    // Add the months
    let newDate = new Date(jsDate.getFullYear(), jsDate.getMonth() + months + 1, 1);
    
    // Go back one day to get the last day of the desired month
    newDate.setDate(newDate.getDate() - 1);
  
    return newDate;
}

exports.parseExcelDate = parseExcelDate;
exports.toExcelDate = toExcelDate;
exports.parseUnixDate = parseUnixDate;
exports.toUnixDate =toUnixDate;
exports.isoDate = isoDate;
exports.parseAnyDate = parseAnyDate;
exports.endOfMonth = endOfMonth;
