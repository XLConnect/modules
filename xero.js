"use strict";

// import libs
var http = require("http.js");

// constants
const baseURL = "https://api.xero.com/api.xro/2.0/";

/**
 * Helper function to wrap a Xero TenantID in a header for use with http calls
 * @param {string} tenantId
 * @returns
 */
function xeroHeader(tenantId) {
    return ({ "xero-tenant-id": tenantId });
}

/**
 * Grab list of connected Xero organisations
 * @returns Array of Objects
 */
function connections() {
    return http.get("https://api.xero.com/connections", null, "xero").sort((a, b,) => a.tenantName > b.tenantName ? 1 : -1);
}

/**
 * Grab Chart of Accounts for tenant
 * @param {string} tenantId
 * @returns
 */
function accounts(tenantId) {
    let uri = baseURL + "Accounts";
    let h = xeroHeader(tenantId);
    return http.get(uri, h, "xero").Accounts;
}

/**
 * Helper function to generate a list of periods
 * @param {string} ToDate YYYY-MM-DD
 * @param {number} Periods number of periods to generate (going back from ToDate)
 * @returns Array of Objects {fromDate, toDate, budgetPeriod}
 */
function periods(ToDate, Periods) {

    let date = new Date(ToDate + "Z"); // Transform the string into a Date Format
    let year = date.getFullYear(); // Year of the date
    let month = date.getMonth(); // Month of the date
    let periods = []; // Array to be returned (with list of periods)

    // Iterates over the number of periods (Starting from 0, indicating last date)
    for (let offset = 0; offset < Periods; offset++) {
        // Generate first and last day of the month
        const first = new Date(Date.UTC(year, month, 1));
        const last = new Date(Date.UTC(year, month + 1, 0));

        periods.push({
            fromDate: first.toISOString().slice(0, 10),
            toDate: last.toISOString().slice(0, 10),
            budgetPeriod: last.toISOString().slice(0, 7),
        });

        month--;
    }

    return periods;
}


function trackingCategories(tenantId){
    const uri = 'https://api.xero.com/api.xro/2.0/TrackingCategories'
    let hds = xeroHeader(tenantId);
    return http.get(uri, hds, "xero").TrackingCategories;
}

/**
 * Grab one balance sheet and unpack the Xero format into a simple table. Only returns AccountID, Period and Value.
 * See BalanceSheetFull for more
 * @param {string} tenantId GUID
 * @param {string} period date in yyyy-mm-dd format
 * @param {string} accountingBasis Accrual or Cash
 * @returns Array of Objects { AccountID, Period, Value }
 */
function profitAndLoss(tenantId, period, accountingBasis = "Accrual") {
    
    let uri = baseURL + "Reports/BalanceSheet?standardLayout=true&date=" + period;
    if (accountingBasis == "Cash") uri += "&paymentsOnly=true";

    const h = xeroHeader(tenantId);
    const bs = http.get(uri, h, "xero");

    const rows = [];
    for (const rowReports of bs.Reports[0].Rows) {
        if (rowReports.RowType == "Section") {
            for (const row of rowReports.Rows) {
                if (row.Cells[0].Attributes != undefined) {
                    rows.push(
                        {
                            AccountID: row.Cells[1].Attributes[0].Value,
                            Period: period,
                            Value: row.Cells[1].Value,
                        },
                    );
                }
            }
        }
    }

    return rows;
}

/**
 * Grab one balance sheet and unpack the Xero format into a simple table. Only returns AccountID, Period and Value.
 * See BalanceSheetFull for more
 * @param {string} tenantId GUID
 * @param {string} period date in yyyy-mm-dd format
 * @param {string} accountingBasis Accrual or Cash
 * @returns Array of Objects { AccountID, Period, Value }
 */
function balanceSheet(tenantId, period, accountingBasis = "Accrual") {

    let uri = baseURL + "Reports/BalanceSheet?standardLayout=true&date=" + period;
    if (accountingBasis == "Cash") uri += "&paymentsOnly=true";

    const h = xeroHeader(tenantId);
    const bs = http.get(uri, h, "xero");

    const rows = [];
    for (const rowReports of bs.Reports[0].Rows) {
        if (rowReports.RowType == "Section") {
            for (const row of rowReports.Rows) {
                if (row.Cells[0].Attributes != undefined) {
                    rows.push(
                        {
                            AccountID: row.Cells[1].Attributes[0].Value,
                            Period: period,
                            Value: row.Cells[1].Value,
                        },
                    );
                }
            }
        }
    }

    return rows;
}

/**
 * Pull journals from datalake
 * @param {string} tenantId
 * @param {string} tenantName used only to display progress updates to the user
 * @param {string} accountingBasis Accrual or Cash
 * @param {string} startDate yyyy-mm-dd
 * @param {string} endDate yyyy-mm-dd
 * @returns Array of Objects
 */
function pullJournals(tenantId, tenantName, accBasis, startDate, endDate) {

    // always sync before pulling it's only a single empty call when there are no new journals and it saves on boilerplate code
    syncJournals(tenantId, tenantName, accBasis);

    // process dates
    const dStart = new Date(startDate);
    let year = dStart.getFullYear();
    let month = dStart.getMonth() + 1;

    const dEnd = new Date(endDate);
    const endYear = dEnd.getFullYear();
    const endMonth = dEnd.getMonth() + 1;

    console.log(startDate)
    console.log(endDate)

    // validations
    const checkDate = new Date("1980-01-01");
    if(dStart ===null) throw "startDate cannot be null"
    if (dStart < checkDate) throw "startDate validation failed: " + dStart.toDateString();
    if(dEnd ===null) throw "startDate cannot be null"
    if (dEnd < checkDate) throw "endDate validation failed: " + dEnd.toDateString();
    if (dEnd < dStart) throw "startDate must be before endDate";

    // get tracking categories 
    const tcCats = trackingCategories(tenantId).filter(tc => tc.Status === 'ACTIVE').map(tc => tc.Name)	

    // read journals from disk
    let jns = [];
    while (true) {

        // read journals
        const periodKey = `${year}-${month}`;
        const filePath = cachePath(tenantId, accBasis, periodKey)
        const dat = read(filePath);
        if (dat) {
            // transform data into rows
            for (const jn of dat) {
                for (const jl of jn.JournalLines) {

                    // todo check that journal is within date range
                    const jr = { ...jn, ...jl };
                    delete jr.JournalLines;

                    // Extract TC
                    let tc1 = null;
                    let tc2 = null;
                    for(let tc of jl.TrackingCategories){
                        if(tc.Name === tcCats[0]) tc1 = tc.Option
                        if(tc.Name === tcCats[1]) tc2 = tc.Option
                    }
                    jr.TrackingCategory1 = tc1
                    jr.TrackingCategory2 = tc2
                    delete jr.TrackingCategories

                    jns.push(jr);
                }
            }
        } else {
            console.log("file not found");
        }

        // next month
        month++;
        if (month > 12) {
            month -= 12;
            year++;
        }
        console.log(year +'-' + month)
        if (year > endYear) break;
        if (year == endYear && month > endMonth) break; // stop pulling files if we're past the end month 
    }
    return jns;
}

function parseXeroDate(xeroDate) {
    const t1 = xeroDate.substring(6, 19);
    const t2 = parseInt(t1);
    return new Date(t2);
}

// functions
// TECH DEBT FOR SPEED CLEAN UP LATER
function write(path, content) {
    return xlc.fileWrite(path, JSON.stringify(content));
}
function read(path) {
    return JSON.parse(xlc.fileRead(path));
}
function list(path) {
    return xlc.fileList(path);
}
function get(uri, hds = null, auth = "Xero") {
    return JSON.parse(xlc.get(uri, hds, auth).Result);
}
function lpad(num) {
    return ("0" + num).slice(-2);
}
function cachePath(tenantId, accBasis, periodKey){
    return `xero/journals/${tenantId}/${accBasis}/${periodKey}.json`;
}

function syncJournals(tenantId, tenantName, accBasis) {

    // read settings from previous run (if there was one)
    let settingsPath = cachePath(tenantId, accBasis, 'settings')
    let settings = read(settingsPath);
    if (!settings) settings = {};

    let progress = 0;
    console.log("-------------------------------------------------------------------");
    console.log("SYNCING " + tenantName);

    // see if we pulled this orgs before
    let lastCreatedDate = getLastCreatedDate(settings);

    // prepare headers for incremental pull (starting at last seen journal)
    const hds = {
        "Xero-Tenant-Id": tenantId,
        "if-modified-since": lastCreatedDate.toUTCString(),
    };
    console.log(hds);

    // grab journals in chunks of 100
    let offset = 0;
    let memFiles = {}; // in memory cache of journals grouped by journal month

    while (true) { // loop until no more chunks

        // grab chunk of journals off of Xero
        var uri = "https://api.xero.com/api.xro/2.0/Journals?offset=" + offset;
        if (accBasis == "Cash") uri += "&paymentsonly=true";
        console.log('fetching ' + uri);
        let batch = get(uri, hds);

        // update user about progress
        progress++;
        if (progress > 10) progress = 0;
        xlc.setProgressValue(progress);

        // update user 
        if (batch.Journals.length > 0) {            
            let lastJournal = batch.Journals[batch.Journals.length - 1];
            let lastDate = parseXeroDate(lastJournal.CreatedDateUTC);
            let lastDateString = lastDate.getFullYear() + "-" + lpad(lastDate.getMonth() + 1) + "-" + lpad(lastDate.getDate());
            xlc.setProgressMessage(`Pulling ${tenantName} journals ${accBasis} up to ${lastDateString}...`);
        }       

        // group journals by yyyy-mm and add to cache
        for (let j of batch.Journals) {

            // update last pulled journal
            let journalCreatedDateUTC = parseXeroDate(j.CreatedDateUTC)
            if(journalCreatedDateUTC > lastCreatedDate) lastCreatedDate = journalCreatedDateUTC

            // get journalDate
            let jd = parseXeroDate(j.JournalDate);
            let y = jd.getFullYear();
            let m = jd.getMonth() + 1;

            // grab of make cache file
            let fileKey = y + "-" + m;
            if (!memFiles[fileKey]) memFiles[fileKey] = readCache(tenantId, accBasis, fileKey);
            let file = memFiles[fileKey];
            
            // update/ set journal
            if(file.length > 0){              
                let idx = file.findIndex(ji => ji.JournalNumber === j.JournalNumber) 
                if(idx > -1){
                    file[idx] = j // update 
                    console.log(`Journal updated! ${fileKey}:${j.JournalNumber}`) // want to monitor how often this actually happens, should be only first journal of each run (= last of prev run)
                }            
                else {
                    file.push(j) // add
                }
            } else {
                file.push(j) // add
            }
        }

        // limit cache to 18 months, else flush to disk and reset
        if (Object.keys(memFiles).length > 24) {
            console.log('In memory cache larger than 24 periods, flushing to disk to limit memory usage')
            setLastCreatedDate(settings, lastCreatedDate);
            writeCache(memFiles, settingsPath, settings, tenantId, accBasis);
            memFiles = {} // reset
        }

        // workout starting point of next chunk
        if (batch.Journals.length < 100) break; // no more chunks

        // work out next starting journal
        offset = Math.max(...batch.Journals.map((j) => j.JournalNumber));
    }

    // write final data to disk
    setLastCreatedDate(settings, lastCreatedDate);
    writeCache(memFiles, settingsPath, settings, tenantId, accBasis);

    console.log("Sync completed");
}

function readCache(tenantId, accBasis, periodKey) {

    const fileName = cachePath(tenantId, accBasis, periodKey)
    let d = read(fileName);
    if (d) {
        console.log("file found: " + fileName);
    } else {
        console.log("new cache created: " + periodKey);
        d = []; 
    }
    return d;

}

function writeCache(memFiles, settingsPath, settings, tenantId, accBasis) {

    console.log("Writing cache to disk ------------------------------------");
    // save last batch to disk
    for (let fileKey in memFiles) {
        let fileName = cachePath(tenantId, accBasis, fileKey)
        console.log('writing ' + fileName);
        write(fileName, memFiles[fileKey]);
    }

    // write settings
    console.log(settingsPath + ":" + settings)
    write(settingsPath, settings);

    console.log("------------------------------------");
}

// wrapper function to read lastCreatedDate from settings for tenantId and AccBasis
function getLastCreatedDate(settings) {
    // find in settings
    if (settings.lastCreatedDate) {
        return new Date(settings.lastCreatedDate);
    }

    return new Date(1900, 0, 1);
}

// wrapper function to write lastCreatedDate to settings for tenantId and AccBasis
function setLastCreatedDate(settings, lastCreatedDate) {
    settings.lastCreatedDate = lastCreatedDate;
}

// exports
exports.connections = connections;
exports.accounts = accounts;
exports.trackingCategories = trackingCategories;
exports.periods = periods;
exports.profitAndLoss = profitAndLoss;
exports.balanceSheet = balanceSheet;
exports.syncJournals = syncJournals;
exports.pullJournals = pullJournals;
