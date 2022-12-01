'use strict'

// import libs 
var http = require ('http.cjs')

// constants
const baseURL = 'https://api.xero.com/api.xro/2.0/'

/**
 * Helper function to wrap a Xero TenantID in a header for use with http calls
 * @param {string} tenantId
 * @returns 
 */
function xeroHeader (tenantId){
    return ({'xero-tenant-id' : tenantId})
}

/**
 * Grab list of connected Xero organisations
 * @returns Array of Objects
 */
function connections () {
    return http.get('https://api.xero.com/connections', null, 'xero').sort((a, b) => a.tenantName > b.tenantName ? 1 : -1)
}

/**
 * Grab Chart of Accounts for tenant
 * @param {string} tenantId 
 * @returns 
 */
function accounts(tenantId){       
    let uri = baseURL + 'Accounts'
    let h   = xeroHeader(tenantId) 
    return http.get(uri, h, 'xero').Accounts
}

/**
 * Helper function to generate a list of periods 
 * @param {string} ToDate YYYY-MM-DD
 * @param {number} Periods number of periods to generate (going back from ToDate)
 * @returns Array of Objects {fromDate, toDate, budgetPeriod}
 */
function periods(ToDate, Periods){
		
	let date    = new Date(ToDate + "Z")   // Transform the string into a Date Format
	let year    = date.getFullYear()       // Year of the date
	let month   = date.getMonth()          // Month of the date
	let periods = []                       // Array to be returned (with list of periods)
	
	// Iterates over the number of periods (Starting from 0, indicating last date)
	for(let offset = 0; offset < Periods; offset++){
	
		// Generate first and last day of the month
		const first = new Date(Date.UTC(year, month, 1))     
		const last  = new Date(Date.UTC(year, month + 1, 0))  
		
		periods.push({ 
			fromDate     : first.toISOString().slice(0, 10),
			toDate 		 : last.toISOString().slice(0, 10),
			budgetPeriod : last.toISOString().slice(0, 7)
		})
		
		month--
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
function balanceSheet(tenantId, period, accountingBasis='Accrual') {	

    let uri = baseURL + 'Reports/BalanceSheet?standardLayout=true&date=' + period
    if(accountingBasis == 'Cash') uri += '&paymentsOnly=true'

    const h = xeroHeader(tenantId)
    const bs = http.get(uri, h, 'xero')
    
    const rows = []
    for(const rowReports of bs.Reports[0].Rows) {
        if(rowReports.RowType == 'Section') {	
            for(const row of rowReports.Rows) {
                if(row.Cells[0].Attributes != undefined){
                    rows.push(
                        {
                            AccountID : row.Cells[1].Attributes[0].Value,                                                       
                            Period  : period,                                
                            Value   : row.Cells[1].Value,
                        }
                    )
                } 
            }
        }	
    }
	
	return rows
}


/**
 * Pull journals from datalake 
 * @param {string} tenantId 
 * @param {string} accountingBasis Accrual or Cash
 * @param {string} startDate yyyy-mm-dd
 * @param {string} endDate yyyy-mm-dd
 * @returns Array of Objects 
 */
function pullJournals(tenantId, accountingBasis, startDate, endDate){
	 
	// process dates 
	const dStart   = new Date(startDate)	    
	let year     = dStart.getFullYear()
	let month    = dStart.getMonth() + 1

    const dEnd 	   = new Date(endDate)   
	const endYear  = dEnd.getFullYear()
	const endMonth = dEnd.getMonth() + 1

    // validations 
    const checkDate = new Date('1980-01-01')
    if(dStart < checkDate) throw 'startDate validation failed: ' + dStart.toDateString()
    if(dEnd   < checkDate) throw 'endDate validation failed: ' + dEnd.toDateString()
    if(dEnd   < dStart) throw 'startDate must be before endDate'
	
	// read journals from disk
	let jns = []
    let loops = 1
	while(true){

        // read journals 
		const path = `journals/${tenantId}/${year}-${month}-${accountingBasis}.json`	
        console.log('reading ' + path)
		const dat = JSON.parse(xlc.fileRead(path))
		if(dat){		
            // transform data into rows 
            for(const jn of Object.values(dat)){		
                for(const jl of jn.JournalLines){		
                    // todo check that journal is within date range 
                    const jr = { ...jn, ...jl }
                    delete jr.JournalLines
                    delete jr.TrackingCategories
                    jns.push(jr)
                }
            }	
        }else{
            console.log('file not found')
        }

		// next month 
		month++
		if(month>12){
			month-=12
			year++
		}
		if(month > endMonth && year==endYear)break
	}
	return jns
}

// exports 
exports.connections = connections
exports.accounts = accounts
exports.periods = periods
exports.balanceSheet = balanceSheet
exports.pullJournals = pullJournals