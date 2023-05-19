"use strict";

function parseExcelDate(dateNumber){
    return new Date(Date.UTC(0, 0, dateNumber - 1));
}

function parseUnixDate(unixTimestamp) {
    return new Date(unixTimestamp * 1000);
}

exports = {
    parseExcelDate,
    parseUnixDate
}