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
        return new Date(date);
    }
}

function eOMonth(startDate, months) {

    // Return the last day of the month, months after the start date
    // Equivalent to Excel's EOMONTH function
    // startDate can be a string, Excel date number or JS Date object

    // Parse the start date
    const jsDate = parseAnyDate(startDate);
  
    // do date math 
    jsDate.setDate(15); // set to middle of current month for edge cases like leap years    
    jsDate.setMonth(jsDate.getMonth() + months + 1); // add months and one more     
    jsDate.setUTCHours(0,0,0,0); // adding months can change the timezone, so reset it to midnight
    jsDate.setDate(-1); // go back to last day of previous month    
    return jsDate;
}

function YYYY_MM_DD(anyDate){
    // return a date string in the format YYYY-MM-DD
    // anyDate can be a string, Excel date number or JS Date object

    let jsDate = parseAnyDate(anyDate);
    return jsDate.toISOString().slice(0,10);
}

function YYYY_MM(anyDate){
    // return a month string in the format YYYY-MM
    // anyDate can be a string, Excel date number or JS Date object

    let jsDate = parseAnyDate(anyDate);
    return jsDate.toISOString().slice(0,7);
}

function utcCToday(){
    const utd = new Date().setUTCHours(0, 0, 0, 0);
    return new Date(utd);
}

exports.parseExcelDate = parseExcelDate;
exports.toExcelDate = toExcelDate;
exports.parseUnixDate = parseUnixDate;
exports.toUnixDate =toUnixDate;
exports.isoDate = isoDate;
exports.parseAnyDate = parseAnyDate;
exports.utcCToday = utcCToday;
exports.eOMonth = eOMonth;
exports.YYYY_MM_DD = YYYY_MM_DD;
exports.YYYY_MM = YYYY_MM;
