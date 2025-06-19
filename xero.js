"use strict";

// import libs
var http = require("http.js");
var util = require("util.js");
require("sql.js"); 

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

function getMarkedTenantId(Connections){
    // returns one tenantId from the Connections table that has the Pull column marked
    if(!Connections) throw 'Please import a Connections table into the workbook'
    if(!Array.isArray(Connections)) throw 'Connections must be an array, please import a Connections table into the workbook'

    const sel = Connections.filter(a => a.Pull)
    if(sel.length != 1) throw 'Please select (only) one tenant to pull'
    const tenantId =sel[0].TenantId
    return tenantId
}

function getMarkedTenantIds(Connections){
    // returns marked tenantIds from the Connections table
    if(!Connections) throw 'Please import a Connections table into the workbook'
    if(!Array.isArray(Connections)) throw 'Connections must be an array, please import a Connections table into the workbook'

    const sel = Connections.filter(a => a.Pull)
    if(sel.length < 1) throw 'Please select at least one tenant to pull'
    const tenantIds = sel.map(a => a.TenantId)
    return tenantIds    
}

/**
 * Grab Chart of Accounts for tenant
 * @param {string} tenantId
 * @returns
 */
function accounts(tenantId, addComputedAccounts=false) {
    let uri = baseURL + "Accounts";
    let h = xeroHeader(tenantId);
    let accs =  http.get(uri, h, "xero").Accounts;

    if(addComputedAccounts){
        accs.push({
            "AccountID" : "FXGROUPID",
            "Code"      : "FXGROUPID",
            "Name"      : "Unrealised Currency Gains",
            "Status"    : "ACTIVE",
            "Type"      : "EXPENSE",            
            "Class"     : "EXPENSE"
        })
        accs.push({
            "AccountID" : "abababab-abab-abab-abab-abababababab",
            "Code"      : "",
            "Name"      : "Current Year Earnings",
            "Status"    : "ACTIVE",
            "Type"      : "EQUITY",            
            "Class"     : "EQUITY"
        })
    }    

    return accs;
}

/**
 * Grab Tax Rates for tenant
 * @param {string} tenantId
 * @returns
 */
function taxRates(tenantId) {
    let uri = baseURL + "TaxRates";
    let h = xeroHeader(tenantId);
    return http.get(uri, h, "xero").TaxRates;
}



/**
 * Helper function to generate a list of periods
 * @param {string} ToDate YYYY-MM-DD
 * @param {number} Periods number of periods to generate (going back from ToDate)
 * @returns Array of Objects {fromDate, toDate, budgetPeriod}
 */
function periods(ToDate, Periods) {

    //let date = new Date(ToDate + "Z"); // Transform the string into a Date Format
    let date = util.parseAnyDate(ToDate); // Transform the string into a Date Format
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

function profitAndLoss(tenantId, tenantName, fromDate, toDate, accountingBasis='Accrual', tc1Id=null, tc2Id=null) {    
   
    let uri = `${baseURL}Reports/ProfitAndLoss?StandardLayout=true&fromDate=${fromDate}&toDate=${toDate}`
    if (accountingBasis.toLowerCase() == "cash") uri += "&paymentsOnly=true";
    if(tc1Id) uri += '&trackingCategoryID=' + tc1Id 
    if(tc2Id) uri += '&trackingCategoryID2=' + tc2Id 

    const hds = { 'xero-tenant-id' : tenantId };
    const plr = http.get(uri, hds, "xero");
    const sections = plr.Reports[0].Rows

    const colHeaders = readColHeaders(sections[0]) // row 0 is col headers 

    let rows = []
    for(const section of sections){	        
        if(section.RowType == "Header") continue
        
        for(const row of section.Rows){
            if(row.Cells[0].Attributes){
                rows.push(cellsToRows(colHeaders, row.Cells, toDate))
            }	
        }	
    }

    return rows.flat().filter(r => r.val != 0)
}

function cellsToRows(headers, cells, period){
	
	const accountId = cells[0].Attributes[0].Value
	
	if(headers.length==2){ // no breakdown by TC, only rowHeader (0) and Total (1)
		return [{             
			AccountID : accountId,			
			Period : period,
			TC1 :  "Unassigned", 
			TC2 :  "Unassigned", 
			Value :  Number(cells[1].Value) 
		}]
	} else { 
		return headers.slice(1, -1).map((h, i) => ({ // first is rowheader, last is row total           
			AccountID : accountId,
			Period : period,
			TC1 : h.tc1, 
			TC2 : h.tc2,  
			Value : Number(cells[i+1].Value) // +1 b/c we moved up one in the headers array (we didn't clip the cells array)
		}))
	}
}

function readColHeaders(header){
	
	const ua =  { tc1 :  "Unassigned", tc2 :  "Unassigned"} 
	
	return header.Cells.map(h => {
		switch(h.Value){
			case "" : return { }
			case "Total" : return ua // this one will only be used if there are only 2 cells (rowheader and total) else the broken down headers will be used 
			case "Unassigned" : return ua
			default : 
				let tcs = h.Value.split(',').map(tc => tc.trim())
				return { tc1 : tcs[0], tc2 : tcs[1] ?? "Unassigned" }
		}
	})
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

function trialBalance(tenantId, date, paymentsOnly = false) {

    let dateYYYMMDD = util.parseAnyDate(date).toISOString().substring(0,10)  

    let uri = baseURL + "Reports/TrialBalance?date=" + dateYYYMMDD;
    if (paymentsOnly) uri += "&paymentsOnly=true";

    let hds = xeroHeader(tenantId);

    let tb = http.get(uri, hds, "xero");

    let rows = [];
    for (let row of tb.Reports[0].Rows) {
        if (row.RowType == "Section") {
            for (let row2 of row.Rows) {
                if (row2.Cells[0].Attributes != undefined) {
                    rows.push(
                        { 
                            Account   : row2.Cells[0].Value,                     
                            AccountID : row2.Cells[0].Attributes[0].Value,
                            Period    : date,
                            Debit     : row2.Cells[1].Value,
                            Credit    : row2.Cells[2].Value,
                            YTDDebit  : row2.Cells[3].Value,
                            YTDCredit : row2.Cells[4].Value,
                        }
                    );
                }
            }
        }
    }

    return rows;
}

function bankTransactions(tenantId, fromDate=null, toDate=null) {

    let uri = baseURL + "BankTransactions";
    let hds = xeroHeader(tenantId);

    let bts = http.get(uri, hds, "xero").BankTransactions; // tried server-side filtering but it's not working, so we'll do it here    

    if(fromDate) {
        let fromDate2 = util.parseAnyDate(fromDate)
        bts = bts.filter(bt => parseXeroDate(bt.Date) >= fromDate2)
    }
    if(toDate) {
        let toDate2 = util.parseAnyDate(toDate)
        bts = bts.filter(bt => parseXeroDate(bt.Date) <= toDate2)
    }
    return bts;
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
function pullJournals(tenantId, tenantName, accBasis, startDate, endDate, syncFirst = true) {

    xlc.setProgressMessage(`Pulling journals for ${tenantName}...`);

    // always sync before pulling it's only a single empty call when there are no new journals and it saves on boilerplate code
    if(syncFirst){
        syncJournals(tenantId, tenantName, accBasis);
    }

    // process dates
    const dStart = new Date(startDate);
    let year = dStart.getFullYear();
    let month = dStart.getMonth() + 1;

    const dEnd = new Date(endDate);
    const endYear = dEnd.getFullYear();
    const endMonth = dEnd.getMonth() + 1;

    console.log(`Pulling journals from ${startDate} to ${endDate}`)

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
        console.log('Reading journals file ' + year +'-' + month)
        const filePath = journalsPath(tenantId, accBasis, periodKey)
        const dat = read(filePath);
        if (dat) {
            // transform data into rows
            for (const jn of dat) {
                for (const jl of jn.JournalLines) {

                    if (parseXeroDate(jn.JournalDate).getTime() > dEnd.getTime()) continue;

					const jr = { ...jn, ...jl };
                    delete jr.JournalLines;

                    // conversions
                    jr.JournalDate = parseXeroDate(jr.JournalDate).toISOString().substring(0,10)
                    jr.CreatedDateUTC = parseXeroDate(jr.CreatedDateUTC).toISOString()                    

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
function journalsPath(tenantId, accBasis, periodKey){
    return `xero/${tenantId}/journals/${accBasis}/${periodKey}.json`;
}

function syncJournals(tenantId, tenantName, accBasis) {

    // read settings from previous run (if there was one)
    let settingsPath = journalsPath(tenantId, accBasis, 'settings')
    let settings = read(settingsPath);
    if (!settings) settings = {};

    xlc.setProgressMax(10);
    let progress = 0;

    console.log("-------------------------------------------------------------------");
    console.log("Syncing " + tenantName);

    // see if we pulled this orgs before
    let lastCreatedDate = getLastCreatedDate(settings);

    // prepare headers for incremental pull (starting at last seen journal)
    const hds = {
        "Xero-Tenant-Id": tenantId,
        "if-modified-since": lastCreatedDate.toUTCString()
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
            xlc.setProgressMessage(`Syncing ${tenantName} ${accBasis} up to ${lastDateString}...`);
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
            if (!memFiles[fileKey]) memFiles[fileKey] = readJournals(tenantId, accBasis, fileKey);
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
            writeJournals(memFiles, settingsPath, settings, tenantId, accBasis);
            memFiles = {} // reset
        }

        // workout starting point of next chunk
        if (batch.Journals.length < 100) break; // no more chunks

        // work out next starting journal
        offset = Math.max(...batch.Journals.map((j) => j.JournalNumber));
    }

    // write final data to disk
    setLastCreatedDate(settings, lastCreatedDate);
    writeJournals(memFiles, settingsPath, settings, tenantId, accBasis);

    console.log("Sync completed");
}

function readJournals(tenantId, accBasis, periodKey) {

    const fileName = journalsPath(tenantId, accBasis, periodKey)
    let d = read(fileName);
    if (d) {
        console.log("file found: " + fileName);
    } else {
        console.log("new cache created: " + periodKey);
        d = []; 
    }
    return d;

}

function writeJournals(memFiles, settingsPath, settings, tenantId, accBasis) {

    console.log("Writing cache to disk ------------------------------------");
    // save last batch to disk
    for (let fileKey in memFiles) {
        let fileName = journalsPath(tenantId, accBasis, fileKey)
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

/** 
 * Changes Xero source names to a human-readable format
 * @param {string} sourceCode: Xero API source
 * @return {string} humanSource: Text to output to the workbook
 */
function sourceLabel(sourceCode) {
	const sourceCodes  = ["ACCREC","ACCPAY","ACCRECCREDIT","ACCPAYCREDIT","ACCRECPAYMENT","ACCPAYPAYMENT","ARCREDITPAYMENT","APCREDITPAYMENT","CASHREC","CASHPAID","TRANSFER","ARPREPAYMENT","APPREPAYMENT","AROVERPAYMENT","APOVERPAYMENT","EXPCLAIM","EXPPAYMENT","MANJOURNAL","PAYSLIP","WAGEPAYABLE","INTEGRATEDPAYROLLPE","INTEGRATEDPAYROLLPT","EXTERNALSPENDMONEY","INTEGRATEDPAYROLLPTPAYMENT","INTEGRATEDPAYROLLCN"]
	const sourceDecode = ["Accounts Receivable Invoice","Accounts Payable Invoice","Accounts Receivable Credit Note","Accounts Payable Credit Note","Payment on an Accounts Receivable Invoice","Payment on an Accounts Payable Invoice","Accounts Receivable Credit Note Payment","Accounts Payable Credit Note Payment","Receive Money Bank Transaction","Spend Money Bank Transaction","Bank Transfer","Accounts Receivable Prepayment","Accounts Payable Prepayment","Accounts Receivable Overpayment","Accounts Payable Overpayment","Expense Claim","Expense Claim Payment","Manual Journal","Payslip","Payroll Payable","Payroll Expense","Payroll Payment","Payroll Employee Payment","Payroll Tax Payment","Payroll Credit Note"]
	const index = sourceCodes.findIndex(code => code === sourceCode);
	return sourceDecode[index]
}

/** 
 * Changes Xero type names to a human-readable format
 * @param {string} typeCode: Xero API type 
 * @return {string} humanSource: Text to output to the workbook
 */
function typeLabel(typeCode) {
	const typeCodes  = ["BANK","CURRENT","CURRLIAB","DEPRECIATN","DIRECTCOSTS","EQUITY","EXPENSE","FIXED","INVENTORY","LIABILITY","NONCURRENT","OTHERINCOME","OVERHEADS","PREPAYMENT","REVENUE","SALES","TERMLIAB","PAYGLIABILITY","SUPERANNUATIONEXPENSE","SUPERANNUATIONLIABILITY","WAGESEXPENSE"]
	const typeDecode = ["Bank account","Current Asset account","Current Liability account","Depreciation account","Direct Costs account","Equity account","Expense account","Fixed Asset account","Inventory Asset account","Liability account","Non-current Asset account","Other Income account","Overhead account","Prepayment account","Revenue account","Sale account","Non-current Liability account","PAYG Liability account","Superannuation Expense account","Superannuation Liability account","Wages Expense account"]
	const index = typeCodes.findIndex(code => code === typeCode);
	return typeDecode[index]
}

function Organisation(tenantId) {
    let hds = xeroHeader(tenantId)
    let org = http.get('https://api.xero.com/api.xro/2.0/Organisation', hds, 'xero')
    return org.Organisations[0]
}

// REGION BUDGETS **************************************************************************************************************************

function budgets(tenantId, fromDate, toDate){

    const hds = xeroHeader(tenantId)
    const from = util.YYYY_MM_DD(fromDate)
    const to = util.YYYY_MM_DD(toDate)
        
    const uri = 'https://api.xero.com/api.xro/2.0/Budgets'
    const budgets = http.get(uri, hds, 'xero')
        
    let result = []
    for(const budget of budgets.Budgets){
        
        // grab budget details 
        const uri2 = uri + `/${budget.BudgetID}?DateFrom=${from}&DateTo=${to}`
        console.log(uri2)
        const data = http.get(uri2, hds, 'xero')	
        const full = data.Budgets[0]
        
        // extract tracking codes 
        const t = full.Tracking 
        const tc1 = t[0]?.Option ?? 'Unassigned'
        const tc2 = t[1]?.Option ?? 'Unassigned' 
        
        // push to result 	
        for(const line of full.BudgetLines){		
            for (const balance of line.BudgetBalances){
                result.push({
                    Budget      : full.Description,
                    Period      : balance.Period,
                    AccountID   : line.AccountID,
                    AccountCode : line.AccountCode,				
                    Amount      : balance.Amount,
                    TC1         : tc1, 
                    TC2         : tc2
                })
            }		
        }
    }
    
    return result
}

function budgetsFolder(tenantId){
    return `xero/${tenantId}/budgets/`;
}

function syncBudgets(tenantId){

    // drops cache for changed budgets 
    // we can;t alreay pull b/c we don't know which periods there are 
    console.log('Start budget cache drop for ' + tenantId)

    // find time of last budget sync 
    let settingsPath = budgetsFolder(tenantId) + 'settings.json'
    let settings = read(settingsPath);    
    if (!settings) settings = {};
    write(settingsPath, settings); // make sure the folder exists 


    let lastCreatedDate = getLastCreatedDate(settings)
    
    const hds = xeroHeader(tenantId)
    const uri = 'https://api.xero.com/api.xro/2.0/Budgets'
    const budgets = http.get(uri, hds, 'xero')
    
    const changedBudgets = budgets.Budgets.filter(b => parseXeroDate(b.UpdatedDateUTC) > lastCreatedDate)

    for(const budget of changedBudgets){

        // drop changed blocks 
        const blockPath = budgetsFolder(tenantId)
        const blockFilter = budget.BudgetID + '*.json'        
        console.log(blockFilter)

        const blocks = list(blockPath, blockFilter)
        for(const block of blocks){
            console.log('Deleting stale cache' + block.block)
            xlc.fileDelete(block)
        }

        // download blocks again?
        // TODO

        // keep track of last seen created date
        let journalCreatedDateUTC = parseXeroDate(budget.UpdatedDateUTC)
        if(journalCreatedDateUTC > lastCreatedDate) lastCreatedDate = journalCreatedDateUTC

    }

    // write settings
    setLastCreatedDate(settings, lastCreatedDate);
    write(settingsPath, settings);

    console.log('Budget cache drop finished ' + tenantId)
    return budgets // return all budgets so we don;t have to call this again     

}

function pullBudgets(tenantId, fromDate, toDate){
    console.log('Budget Pull started ' + tenantId)

    // validations
    if(!tenantId) throw 'Please provide a tenantId'
    if(!fromDate) throw 'Please provide a fromDate'
    if(!fromDate instanceof Date) throw 'fromDate must be a date'
    if(!toDate) throw 'Please provide a toDate'
    if(!toDate instanceof Date) throw 'toDate must be a date'
    if (toDate < fromDate) throw 'fromDate must be before toDate';


    // sync budgets first (we need to ask for the list of budgets and whatever is in there needs to be pulled)
    const budgets = syncBudgets(tenantId)
    
    // find period blocks for this budget
    const blocks = periodBlocks(fromDate, toDate)

    const result = []

    for(const budget of budgets.Budgets){
        for(const block of blocks){
            
            // pull budgets for this block
            const blockPath = budgetsFolder(tenantId) + budget.BudgetID + '-' + block.block + '.json'
            let data = read(blockPath)
            
            // if block not in cache, pull it from Xero
            if(data) {
                console.log('Found cache for budget ' + budget.Description + ' ' + block.block)
            }else{
                
                const uri = 'https://api.xero.com/api.xro/2.0/Budgets/' + budget.BudgetID + '?DateFrom=' + block.startDate + '&DateTo=' + block.endDate
                
                const msg = 'Syncing budget ' + budget.Description + ' ' + block.block 
                console.log(msg + ": " + uri)
                xlc.setProgressMessage(msg)

                const hds = xeroHeader(tenantId)
                const reply = http.get(uri, hds, 'xero')
                data = reply.Budgets[0] // strip header 
                if(data) write(blockPath, data) // write to disk 
            } // no data for this block, skip it

            // extract tracking codes 
            const t = data.Tracking 
            const tc1 = t[0]?.Option ?? 'Unassigned'
            const tc2 = t[1]?.Option ?? 'Unassigned' 
            
            // push to result 	
            for(const line of data.BudgetLines){		
                for (const balance of line.BudgetBalances){
                    result.push({
                        Budget      : data.Description,
                        Period      : balance.Period,
                        AccountID   : line.AccountID,
                        AccountCode : line.AccountCode,				
                        Amount      : balance.Amount,
                        TC1         : tc1, 
                        TC2         : tc2
                    })
                }		
            }
        }


    }
    console.log('Budget pull finished for ' + tenantId)

    return result
}

// xero will only allow us to pull 24 months of data per call, so we need to work out the periods we need to pull
function periodBlocks(startDate, endDate) {

    const start = new Date(startDate);
    const end = new Date(endDate);
    const periods = [];
    
    let currentYear = start.getFullYear();
    // Adjust to previous odd year if necessary to include start year
    if (currentYear % 2 === 0) {
        currentYear -= 1;
    }
    
    const endYear = end.getFullYear();
    
    while (currentYear <= endYear) {
        const periodStart = `${currentYear}-01-01`;
        const periodEnd = `${currentYear + 1}-12-31`;
        periods.push({
			block : `${currentYear}-${currentYear+1}`,
			startDate : util.YYYY_MM_DD(periodStart),
			endDate : util.YYYY_MM_DD(periodEnd),
		}),
		
        currentYear += 2;
    }
    
    return periods;
}


function deepLink(ShortCode, SourceType, SourceID){	
	const base = `https://go.xero.com/organisationlogin/default.aspx?shortcode=${ShortCode}&redirecturl=`
	const page = sourceTypePage(SourceType)	    
	return base + page + SourceID	
}

function sourceTypePage(SourceType){
	switch(SourceType){
		
		case 'ACCPAY': return '/AccountsPayable/View.aspx?invoiceID='
		case 'ACCPAYCREDIT': return '/AccountsPayable/ViewCreditNote.aspx?invoiceID='
					
		case 'ACCREC': return '/AccountsReceivable/View.aspx?invoiceID='
		case 'ACCRECCREDIT': return '/AccountsReceivable/ViewCreditNote.aspx?invoiceID='
			
		case 'ACCRECPAYMENT': 			
		case 'ACCPAYPAYMENT':
		case 'APCREDITPAYMENT':
		case 'CASHPAID':
		case 'CASHREC':
		case 'TRANSFER': return '/Bank/ViewTransaction.aspx?bankTransactionID='

		case 'MANJOURNAL': return '/Journal/View.aspx?invoiceID='
	}
}

function periodsPLBSFromJournals(Connections, endDate, numPeriods, accBasis = 'ACCRUAL', syncFirst = true, skipFXGROUPIDCheck = false, returnTS=true) {
    /*

    Connections: can be either
        a single tenantId string like '0f01a872-2590-4ea2-b702-1805bf969e8c' to pull a single company or
        a Connections table with Pull column marked
    endDate: YYYY-MM-DD
    numPeriods: number of periods to pull (e.g. 12 for 1 year)
    accBasis: either 'ACCRUAL' or 'CASH'
    syncFirst: boolean, if true will sync journals before pulling them
    skipFXGROUPIDCheck: boolean, if true will skip the check for multiple currencies in the journals

    */
    // validations ************************************************
    // check if Connections is an array or a single string 
    if(!Connections) throw 'Please import a Connections table into the workbook'
    let conns = []
    if(Array.isArray(Connections)){
        conns = Connections.filter(c => c.Pull)
        if(conns.length < 1) throw 'Please select one tenant to pull'
    } else {
        conns = [{ tenantId : Connections }]
    }

    // endate must be in the format YYYY-MM-DD
    if(!endDate) throw 'Please provide an endDate'
    // use regex to assert the date is in the format YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if(!dateRegex.test(endDate)) throw 'endDate must be in the format YYYY-MM-DD'

    // numPeriods must be a number greater than 0  
    if(!numPeriods) throw 'Please provide a number of periods' 
    if(numPeriods < 1) throw 'numPeriods must be a number greater than 0'

    // accbasis must be either 'ACCRUAL' or 'CASH'
    if(!['ACCRUAL','CASH'].includes(accBasis)) throw 'accBasis must be either "ACCRUAL" or "CASH"'
    

    // grab periods and work out some needed dates
    const periods = xero.periods(endDate, numPeriods + 1).sort((a, b) => a.toDate.localeCompare(b.toDate)) //  1 extra to get the endDate of previous period
    const prevEnd = periods[0].toDate
    periods.shift() // remove the last element we added to get the endDate of the previous period
    const startDate = periods[0].toDate

    // init 
    const PL = []
    const BS = []
    const TS = []
    const ACC = []
    const ORG = []
    
    // loop over all connections
    for(const conn of conns){

        // org details 
        const org = Organisation(conn.tenantId)
        
        // find Current Year Earnings (CYE) reset date
        let fyStartMonth = org.FinancialYearEndMonth + 1
        if(fyStartMonth > 12) fyStartMonth -= 12 // xero uses 0-11 for months, we need 1-12
       
        for(let period of periods){
            let month = Number(period.toDate.split('-')[1])             
            period.fyYearStart = (month === fyStartMonth ? true : false)            
        }        
        console.log(periods)

        // sync journals
        if(syncFirst){
            syncJournals(conn.tenantId, org.Name, accBasis)
        }

        // pull journals for period 
        const jns = pullJournals(conn.tenantId, org.Name, accBasis, startDate, endDate, false)

        // validations
        // check how many currencies we have, we don't do FXGROUPID yet
        if(!skipFXGROUPIDCheck){ 
            const currencies = jns.map(j => j.CurrencyCode).unique()
            if(currencies.length > 1) throw 'Multiple currencies found, code does not support computation of FXGROUPID yet. Set skipFXGROUPIDCheck to true to skip this check.'
        }

        console.log('Computing..')
        // add period journals fall into
        for(let jn of jns){
            jn.Period = util.YYYY_MM_DD(util.eOMonth(jn.JournalDate, 0))
            jn.Value = jn.NetAmount
            jn.DeepLink = deepLink(org.ShortCode, jn.SourceType, jn.SourceID)
        }
            
        // condense
        const gls = jns.agg({	
            AccountID 	: group,
            Period 		: group,
            TrackingCategory1 : group,
            TrackingCategory2 : group,
            Value 	: sum
        })

        // add account details 
        const accs = accounts(conn.tenantId, true)
        for(const gl of gls){
            const acc = accs.find(a => a.AccountID === gl.AccountID)
            if(acc){
                gl.AccountCode = acc.Code,
                gl.AccountName = acc.Name,
                gl.Class = acc.Class,
                gl.Type = acc.Type
            }
        }

        // split PL and BS 
        const plClasses = ["REVENUE","EXPENSE"]
        const pl = gls.filter(a => plClasses.includes(a.Class))

        /*
        const bs = gls.filter(a => !plClasses.includes(a.Class))

   
        // condense bs further without TC's (they don't come with the start balnace) 
        const bs2 = bs
            .agg({
                AccountID 	: group,
                Period 		: group,
                Class 		: group,
                Value 		: sum
            })
            .sort((a, b) => a.Period > b.Period)

        // grab opening balance 
        const bsPrev = balanceSheet(conn.tenantId, prevEnd)
        for(const sb of bsPrev){
            sb.Period = util.YYYY_MM_DD(sb.Period)
            sb.Value = Number(sb.Value)
        }

        // initialize running sum with opening balance 
        const runningSums = Object.fromEntries(bsPrev.map(sb => [sb.AccountID, sb.Value]))

        // prepare list of accounts
        const cyeAcc = 'abababab-abab-abab-abab-abababababab' // Current Year Earnings
        const accountIds = bs2.unique('AccountID').concat(bsPrev.unique('AccountID')).unique()
        if(!accountIds.includes(cyeAcc)) accountIds.push(cyeAcc)

        const result = [];

        // loop over every account and period to make sure we fill out any gaps where there weren't any transactiosn for an account 
        let entry = {}
        periods.forEach(period => {

             // year end process
             if(period.fyYearStart){
                console.log('Year end process for ' + period.toDate)
                let retEarnAcc = accs.find(a => a.SystemAccount === 'RETAINEDEARNINGS')
                if(!retEarnAcc) throw 'Could not find system account RETAINEDEARNINGS for tenant ' + conn.tenantName          
                console.log(runningSums);
                if (!runningSums[retEarnAcc.AccountID]) runningSums[retEarnAcc.AccountID] = 0;        
                runningSums[retEarnAcc.AccountID] += runningSums[cyeAcc]
                runningSums[cyeAcc] = 0 // reset CYE for next year                
                console.log('Running sums after year end process')
                console.log(runningSums);
            }


            accountIds.forEach(accountId => {
                
                if(accountId === cyeAcc){
                    
                    // if first period of year, reset running sum 
                    //if(period.resetCYE) runningSums[accountId] = 0
                    
                    const cyeEquity = bs2
                            .filter(b => b.Period === period.toDate && b.Class === 'EQUITY')
                            .sum('Value')
                    
                    const cyeRest = bs2
                            .filter(b => b.Period === period.toDate && b.Class != 'EQUITY')
                            .sum('Value')			
                    
                    entry = {
                        Class : 'EQUITY',
                        Value : cyeEquity - cyeRest
                    }                   
                    
                } else {
                
                    // Find journal entry for this account and period
                    entry = bs2.find(j => 
                        j.AccountID === accountId && j.Period === period.toDate
                    );
                }
            
                // Update running sum
                if (!runningSums[accountId]) runningSums[accountId] = 0;
                
                if(entry){
                    // flip sign for Assets (Debit side)			
                    let value = entry.Class == 'ASSET' ? entry.Value : -entry.Value;		
                    runningSums[accountId] += value;
                }     

                result.push({
                    Period	  : period.toDate,
                    AccountID : accountId,
                    Value     : Number(runningSums[accountId].toFixed(2))
                });

                 // if first period of year, reset running sum 
                 //if(period.yearEnd && accountId === cyeAcc) runningSums[accountId] = 0
                
            });	

           
        });

        // add account details to BS part again
        for(const gl of result){
            const acc = accs.find(a => a.AccountID === gl.AccountID)
            if(acc){
                gl.AccountCode = acc.Code,
                gl.AccountName = acc.Name,
                gl.Class = acc.Class,
                gl.Type = acc.Type
            }
        }

        */

        // add company and add to totals
        pl.forEach(p => p.Company = org.Name)
        PL.push(pl)
        //result.forEach(b => b.Company = org.Name)
        //BS.push(result)
        jns.forEach(j => j.Company = org.Name)
        TS.push(jns)       
        accs.forEach(a => a.Company = org.Name)
        ACC.push(accs)
        ORG.push(org)
    }

    console.log('Done!')

    // return result
    return {
        PL : PL.flat(),
        //BS : BS.flat(),
        TS : returnTS ? TS.flat() : [],
        ACC : ACC.flat(),
        ORG : ORG.flat()
    }
}


// SECTION INVOICES ******************************************************************************************************************


const _invoiceFileTypes = ["Invoices", "CreditNotes", "Overpayments", "Prepayments"] // capitalized to align with contents of json 
function syncAllInvoiceTypes(tenantId) {
	for (const fileType of _invoiceFileTypes) syncInvoiceType(tenantId, fileType)
}

function syncInvoiceType(tenantId, fileType) {

	if (!_invoiceFileTypes.includes(fileType)) throw `Invalid type of invoice: ${fileType}`

	const msg = `Syncing ${fileType}...`
	xlc.setProgressMessage(msg);
	console.log(msg);
	let progress = 0;
	xlc.setProgressMax(10);

	// read settings from previous run (if there was one)
	let settingsPath = invoicesPath(tenantId, 'settings')
	let settings = read(settingsPath);
	if (!settings) settings = {};

	let lastModifiedDate = getLastInvoiceCreatedDate(settings, fileType);
	let invPath = invoicesPath(tenantId, fileType)
	let data = read(invPath) ?? {}	

	let hds = {
		"xero-tenant-id": tenantId,
		"if-modified-since": lastModifiedDate.toUTCString(),
	}

	const maxDate = (a, b) => a > b ? a : b;
	// loop over new invoices 
	const typeID = fileType.slice(0, -1) + "ID"
	let page = 1
	while (true) {

		const uri = `https://api.xero.com/api.xro/2.0/${fileType}?page=${page}`
		console.log(uri)
		const invs = http.get(uri, hds, 'xero')

		// updaet last modified 
		if (invs[fileType].length > 0) {
			const maxModified = invs[fileType]
				.map(i => xero.parseXeroDate(i.UpdatedDateUTC))
				.reduce(maxDate);

			lastModifiedDate = maxDate(lastModifiedDate, maxModified)
		}

		progress++
		if (progress > 10) progress = 0;
		xlc.setProgressValue(progress);
		xlc.setProgressMessage(`Syncing ${fileType} until ${lastModifiedDate.toISOString().slice(0, 10)}`)

		invs[fileType].map(i => data[i[typeID]] = i)

		if (invs[fileType].length < 100) break
		page++

		if (page % 20 == 0) {
			// write progress so far, if the process get aborted next pull will start from here 
			write(invPath, data)
			setLastInvoiceCreatedDate(settings, fileType, lastModifiedDate)
			write(settingsPath, settings)
		}
	}

	// close shop 
	write(invPath, data)
	setLastInvoiceCreatedDate(settings, fileType, lastModifiedDate)
	write(settingsPath, settings)

}

function getLastInvoiceCreatedDate(settings, type) {

	// transitional code, remove after a while 
	if (type == 'Invoices' && settings.lastCreatedDate) {
		console.log('updating old settings')
		settings[type] = settings.lastCreatedDate
		delete settings.lastCreatedDate
	}

	// find in settings
	if (settings[type]) {
		return new Date(settings[type]);
	}

	return new Date(1900, 0, 1);
}

function setLastInvoiceCreatedDate(settings, type, lastCreatedDate) {
	settings[type] = lastCreatedDate;
}

function invoicesPath(tenantId, type) {
	return `xero/${tenantId}/invoices/${type}.json`
}

function pullInvoices(tenantId, invoiceType, asAtDate, syncFirst=true) {

    if(syncFirst) syncInvoiceType(tenantId, 'Invoices')
    
	// validate inputs
	if (!(invoiceType === 'ACCREC' || invoiceType === 'ACCPAY')) throw 'invoiceType must be a string either ACCREC or ACCPAY'
	// TODO option to pull AS IS (as at date == null?)
	//if (!asAtDate instanceof Date) throw 'asAtDate must be a Date'
    const asAtDate2 = util.parseAnyDate(asAtDate)

	// check cache validity / load data 	
    const invsPath = invoicesPath(tenantId, 'Invoices')
    console.log('loading invoices from ' + invsPath)
    let data = read(invsPath)

	let res = []
	console.log('start Invoices')
	for (const inv of Object.values(data)) {

		if(inv.Type != invoiceType) continue;
		if (inv.Status == 'VOIDED' || inv.Status == 'DELETED'|| inv.Status == 'DRAFT' || inv.Status == 'SUBMITTED') continue;  // TODO how can we determine if invoice was voided at as at date?
		if (inv.Total == 0) continue; // not interested in 0 invoices 

		// not fully paid -> compute as at state and add to result 
		let total = xero.parseXeroDate(inv.Date) <= asAtDate2 ? inv.Total : 0 // only count total after Invoice Date 
		let paid = 0
		for (const p of inv.Payments) {
			if (xero.parseXeroDate(p.Date) <= asAtDate2) paid += p.Amount
		}
		for (const c of inv.CreditNotes) {
			if (xero.parseXeroDate(c.Date) <= asAtDate2) paid += c.AppliedAmount
		}
		for (const o of inv.Overpayments) {
			if (xero.parseXeroDate(o.Date) <= asAtDate2) paid += o.AppliedAmount
		}	
		for (const p of inv.Prepayments) {
			if (xero.parseXeroDate(p.Date) <= asAtDate2) paid += p.AppliedAmount
		}

		if(Math.abs(total - paid) > 0.01 ){
		
			res.push({				
				ID: inv.InvoiceID,
				Type: inv.Type,
				TenantId: tenantId,
				AsAtDate: asAtDate2.toISOString().slice(0, 10),
				Number: inv.InvoiceNumber,
				Reference: inv.Reference,
				StatusToday: inv.Status,
				ContactName: inv.Contact.Name,
				ContactID: inv.Contact.ContactID,
				
				InvoiceDate: xero.parseXeroDate(inv.Date).toISOString().slice(0, 10),
				DueDate: xero.parseXeroDate(inv.DueDate).toISOString().slice(0, 10),

				CurrencyCode: inv.CurrencyCode,
				CurrencyRate: inv.CurrencyRate,

				Total: total,
				Paid: paid,
				Remaining: total - paid
			})
		}
	}

	console.log('Invoices completed')

	return res
}

function pullCreditNotes(tenantId, asAtDate, syncFirst=true){

	// validate inputs 
	const asAtDate2 = util.parseAnyDate(asAtDate)

    if(syncFirst) syncInvoiceType(tenantId, 'CreditNotes')


	// check/ load cache 	
    const invsPath = invoicesPath(tenantId, 'CreditNotes')
    console.log('loading CreditNotes from ' + invsPath)
    let data = read(invsPath)
    
	console.log('start CreditNotes')
	let res = []
	for(const cn of Object.values(data)){

		//if (cn.Status == 'VOIDED' || cn.Status == 'DELETED') continue; 
		if (cn.Status == 'VOIDED' || cn.Status == 'DELETED'|| cn.Status == 'DRAFT' || cn.Status == 'SUBMITTED') continue;  // TODO how can we determine if invoice was voided at as at date?

		let total = new Date(cn.DateString) <= asAtDate2 ? cn.Total : 0 // only count total after Invoice Date 
		
		let allocated = 0		
		for(const pm of cn.Payments){		
			if(xero.parseXeroDate(pm.Date) <= asAtDate2)allocated += pm.Amount
		}
		for(const alloc of cn.Allocations){			
			if(xero.parseXeroDate(alloc.Date)  <= asAtDate2)allocated += alloc.Amount				
		}
		
		if(Math.abs(total - allocated) > 0.01 ){
			res.push({				
				ID: cn.CreditNoteID,
				Type: cn.Type,
				TenantId: tenantId,
				AsAtDate: asAtDate2.toISOString().slice(0, 10),
				Number: cn.CreditNoteNumber,
				Reference: cn.Reference,
				StatusToday: cn.Status,
				ContactName: cn.Contact.Name,
				ContactID: cn.Contact.ContactID,
				
				InvoiceDate: xero.parseXeroDate(cn.Date).toISOString().slice(0, 10),
				DueDate: null,

				CurrencyCode: cn.CurrencyCode,
				CurrencyRate: cn.CurrencyRate,

				Total: total,
				Paid: allocated,
				Remaining: total - allocated
			})
		}
	}
	console.log('CreditNotes completed')
	return res
}

function pullOverpayments(tenantId, asAtDate, syncFirst=true){

	// validate inputs 
	const asAtDate2 = util.parseAnyDate(asAtDate)

    if(syncFirst) syncInvoiceType(tenantId, 'Overpayments')

	// check/ load cache 	
    const invsPath = invoicesPath(tenantId, 'Overpayments')
    console.log('loading CreditNotes from ' + invsPath)
    let data = read(invsPath)

	console.log('start Overpayments')
	let res = []
	for(const cn of Object.values(data)){

		//if (cn.Status == 'VOIDED' || cn.Status == 'DELETED') continue; 
		if (cn.Status == 'VOIDED' || cn.Status == 'DELETED'|| cn.Status == 'DRAFT' || cn.Status == 'SUBMITTED') continue;  // TODO how can we determine if invoice was voided at as at date?

		let total = new Date(cn.DateString) <= asAtDate2 ? cn.Total : 0 // only count total after Invoice Date 
		
		let allocated = 0		
		for(const pm of cn.Payments){		
			if(xero.parseXeroDate(pm.Date) <= asAtDate2)allocated += pm.Amount
		}
		for(const alloc of cn.Allocations){			
			if(xero.parseXeroDate(alloc.Date)  <= asAtDate2)allocated += alloc.Amount				
		}
		
		if(Math.abs(total - allocated) > 0.01 ){
			res.push({				
				ID: cn.CreditNoteID,
				Type: cn.Type,
				TenantId: tenantId,
				AsAtDate: asAtDate2.toISOString().slice(0, 10),
				Number: cn.CreditNoteNumber,
				Reference: cn.Reference,
				StatusToday: cn.Status,
				ContactName: cn.Contact.Name,
				ContactID: cn.Contact.ContactID,
				
				InvoiceDate: xero.parseXeroDate(cn.Date).toISOString().slice(0, 10),
				DueDate: null,

				CurrencyCode: cn.CurrencyCode,
				CurrencyRate: cn.CurrencyRate,

				Total: total,
				Paid: allocated,
				Remaining: total - allocated
			})
		}
	}
	console.log('Overpayments completed')
	return res
}

function pullPrepayments(tenantId, asAtDate, syncFirst=true){

	// validate inputs 
	const asAtDate2 = util.parseAnyDate(asAtDate)

    if(syncFirst) syncInvoiceType(tenantId, 'Prepayments')

	// check/ load cache 	
    const invsPath = invoicesPath(tenantId, 'Prepayments')
    console.log('loading CreditNotes from ' + invsPath)
    let data = read(invsPath)

	console.log('start Prepayments')
	let res = []
	for(const cn of Object.values(data)){

		//if (cn.Status == 'VOIDED' || cn.Status == 'DELETED') continue; 
		if (cn.Status == 'VOIDED' || cn.Status == 'DELETED'|| cn.Status == 'DRAFT' || cn.Status == 'SUBMITTED') continue;  // TODO how can we determine if invoice was voided at as at date?

		let total = new Date(cn.DateString) <= asAtDate2 ? cn.Total : 0 // only count total after Invoice Date 
		
		let allocated = 0		
		for(const pm of cn.Payments){		
			if(xero.parseXeroDate(pm.Date) <= asAtDate2)allocated += pm.Amount
		}
		for(const alloc of cn.Allocations){			
			if(xero.parseXeroDate(alloc.Date)  <= asAtDate2)allocated += alloc.Amount				
		}
		
		if(Math.abs(total - allocated) > 0.01 ){
			res.push({				
				ID: cn.CreditNoteID,
				Type: cn.Type,
				TenantId: tenantId,
				AsAtDate: asAtDate2.toISOString().slice(0, 10),
				Number: cn.CreditNoteNumber,
				Reference: cn.Reference,
				StatusToday: cn.Status,
				ContactName: cn.Contact.Name,
				ContactID: cn.Contact.ContactID,
				
				InvoiceDate: xero.parseXeroDate(cn.Date).toISOString().slice(0, 10),
				DueDate: null,

				CurrencyCode: cn.CurrencyCode,
				CurrencyRate: cn.CurrencyRate,

				Total: total,
				Paid: allocated,
				Remaining: total - allocated
			})
		}
	}
	console.log('Prepayments completed')
	return res
}



/*
function invoicesPath(tenantId, id) {
	return `xero/${tenantId}/invoices/${id}.json`
}
*/


// exports
exports.connections = connections;
exports.getMarkedTenantId = getMarkedTenantId;
exports.getMarkedTenantIds = getMarkedTenantIds;
exports.Organisation = Organisation;
exports.accounts = accounts;
exports.trackingCategories = trackingCategories;
exports.taxRates = taxRates;
exports.periods = periods;
exports.profitAndLoss = profitAndLoss;
exports.balanceSheet = balanceSheet;
exports.periodsPLBSFromJournals = periodsPLBSFromJournals;
exports.trialBalance = trialBalance;
exports.budgets = budgets;
exports.syncBudgets = syncBudgets;
exports.pullBudgets = pullBudgets;
exports.bankTransactions = bankTransactions;
exports.syncJournals = syncJournals;
exports.pullJournals = pullJournals;
exports.sourceLabel = sourceLabel;
exports.typeLabel = typeLabel;
exports.deepLink = deepLink;
exports.baseURL = baseURL;
exports.parseXeroDate = parseXeroDate;
exports.xeroHeader = xeroHeader;

exports.syncInvoiceType = syncInvoiceType;
exports.syncAllInvoiceTypes = syncAllInvoiceTypes;
exports.pullInvoices = pullInvoices;
exports.pullCreditNotes = pullCreditNotes;
exports.pullOverpayments = pullOverpayments;
exports.pullPrepayments = pullPrepayments;
