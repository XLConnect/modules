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
  return http.get("https://api.xero.com/connections", null, "xero").sort((
    a,
    b,
  ) => a.tenantName > b.tenantName ? 1 : -1);
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
 * @param {string} tenantName Organisation name
 * @param {string} accountingBasis Accrual or Cash
 * @param {string} startDate yyyy-mm-dd
 * @param {string} endDate yyyy-mm-dd
 * @returns Array of Objects
 */
function pullJournals(tenantId, tenantName, accBasis, startDate, endDate) {
  // merged sync with pull operations to avoid boilerplating
  syncJournals(tenantId, tenantName, accBasis)

  // process dates
  const dStart = new Date(startDate);
  let year = dStart.getFullYear();
  let month = dStart.getMonth() + 1;

  const dEnd = new Date(endDate);
  const endYear = dEnd.getFullYear();
  const endMonth = dEnd.getMonth() + 1;

  // validations
  const checkDate = new Date("1980-01-01");
  if (dStart < checkDate) {
    throw "startDate validation failed: " + dStart.toDateString();
  }
  if (dEnd < checkDate) {
    throw "endDate validation failed: " + dEnd.toDateString();
  }
  if (dEnd < dStart) throw "startDate must be before endDate";

  // read journals from disk
  let jns = [];
  let loops = 1;
  while (true) {
    // read journals
    const fileName = `journals/${tenantId}/${accBasis}/${year}-${month}.json`;
    console.log("reading " + fileName);
    const dat = JSON.parse(xlc.fileRead(fileName));
    if (dat) {
      // transform data into rows
      for (const jn of Object.values(dat)) {
        for (const jl of jn.JournalLines) {
          // todo check that journal is within date range
          const jr = { ...jn, ...jl };
          delete jr.JournalLines;
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
    if (year > endYear) break;
    if (year == endYear && month > endMonth) break;
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

function syncJournals(tenantId, tenantName, accBasis) {

  // transitional code: delete old cache structure if found
  let oldSettings = xlc.fileRead("journals/settings.json");
  if (oldSettings) xlc.folderDelete("journals", true);

  // read settings from previous run (if there was one)
  let settingsPath = `journals/${tenantId}/${accBasis}/settings.json`;
  let settings = read(settingsPath);
  if (!settings) settings = {};

  let progress = 0;
  console.log(
    "---------------------------------------------------------------------",
  );
  console.log("SYNCING " + tenantName);

  // see if we pulled this orgs before
  let lastCreatedDate = getLastCreatedDate(settings, tenantId, accBasis);

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
    console.log("fetching 100 journals from " + offset);

    // grab chunk of journals off of Xero
    var uri = "https://api.xero.com/api.xro/2.0/Journals?offset=" + offset;
    if (accBasis == "Cash") uri += "&paymentsonly=true";
    console.log(uri);
    let batch = get(uri, hds);

    // update user about progress
    progress++;
    if (progress > 10) progress = 0;
    xlc.setProgressValue(progress);

    if (batch.Journals.length > 0) {
      let lastJournal = batch.Journals[batch.Journals.length - 1];
      let lastDate = parseXeroDate(lastJournal.CreatedDateUTC);
      let lastDateString = lastDate.getFullYear() + "-" +
        lpad(lastDate.getMonth() + 1) + "-" + lpad(lastDate.getDate());
      xlc.setProgressMessage(
        "Pulling " + tenantName + " journals (" + accBasis + ") up to " +
          lastDateString + " ...",
      );
    }

    // update settings
    let createdDates = batch.Journals.map((j) =>
      parseXeroDate(j.CreatedDateUTC)
    );
    let lastCreatedDate = Math.max(...createdDates);
    setLastCreatedDate(settings, tenantId, accBasis, lastCreatedDate);

    // group journals by yyyy-mm and add to cache
    for (let j of batch.Journals) {
      let jd = parseXeroDate(j.JournalDate);
      let y = jd.getFullYear();
      let m = jd.getMonth() + 1;

      // grab file
      let fileKey = y + "-" + m;
      if (!memFiles[fileKey]) { // key not in cache
        // see if we can find data for this period on disk
        let fileName = `journals/${tenantId}/${accBasis}/${fileKey}.json`;
        let d = read(fileName);
        if (d) {
          console.log("file found: " + fileName);
        } else {
          d = {};
        }
        memFiles[fileKey] = d;
      }
      let file = memFiles[fileKey];

      // update/ set journal
      file[j.JournalNumber] = j;
    }

    // limit cache to 18 months, else flush to disk and reset
    if (Object.keys(memFiles).length > 36) {
      flushCache(memFiles, settingsPath, settings, tenantId, accBasis);
    }

    // workout starting point of next chunk
    if (batch.Journals.length < 100) break; // no more chunks

    // work out next starting journal
    offset = Math.max(...batch.Journals.map((j) => j.JournalNumber));
  }

  // write final data to disk
  flushCache(memFiles, settingsPath, settings, tenantId, accBasis);
}

function flushCache(memFiles, settingsPath, settings, tenantId, accBasis) {
  console.log("Flushing cache to disk ------------------------------------");

  // save last batch to disk
  writeFiles(memFiles, tenantId, accBasis);

  // write settings
  write(settingsPath, settings);

  // drop and recreate cache
  //delete memFiles
  memFiles = {};
}

// wrapper function to read lastCreatedDate from settings for tenantId and AccBasis
function getLastCreatedDate(settings, tenantId, accBasis) {
  // find in settings
  if (settings.lastCreatedDate) {
    return new Date(settings.lastCreatedDate);
  }

  return new Date(1900, 0, 1);
}

// wrapper function to write lastCreatedDate to settings for tenantId and AccBasis
function setLastCreatedDate(settings, tenantId, accBasis, lastCreatedDate) {
  settings.lastCreatedDate = lastCreatedDate;
}

// write cache with files journals grouped per month to disk
function writeFiles(cache, tenantId, accBasis) {
  for (let fileKey in cache) {
    let fileName = `journals/${tenantId}/${accBasis}/${fileKey}.json`;
    console.log(fileName);
    write(fileName, cache[fileKey]);
  }
}

// exports
exports.connections = connections;
exports.accounts = accounts;
exports.periods = periods;
exports.balanceSheet = balanceSheet;
exports.syncJournals = syncJournals;
exports.pullJournals = pullJournals;
