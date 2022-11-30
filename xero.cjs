// import libs 
http = require ('http.cjs')

// constants
const baseURL = 'https://api.xero.com/api.xro/2.0/'

function hds (tenantId){
    return ({'xero-tenant-id' : tenantId})
}

function orgs () {
    return http.get('https://api.xero.com/connections', null, 'xero').sort((a, b) => a.tenantName > b.tenantName ? 1 : -1)
}

function Accounts(tenantId){       
    let uri = baseURL + 'Accounts'
    let h   = hds(tenantId) 
    return http.get(uri, h, 'xero')
}

function generatePeriods(ToDate, Periods){
		
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

function BalanceSheet(tenantId, period, AccBasis) {	

	const rows = []

    let uri = baseURL + 'Reports/BalanceSheet?standardLayout=true&date=' + period
    if(AccBasis == 'Cash') uri += '&paymentsOnly=true'
    const hds = hds(tenantId)
    const bs    = http.get(uri, hds, 'xero')
    
    for(const rowReports of bs.Reports[0].Rows) {
        if(rowReports.RowType == 'Section') {				
            if(rowReports.Rows.length > 0) {					
                for(const row of rowReports.Rows) {
                    if(row.Cells[0].Attributes != undefined){
                        // Step 2: Pushing the row data
                        rows.push(
                            {
                                AccountId : row.Cells[1].Attributes[0].Value,                                                       
                                Period  : period,                                
                                Value   : row.Cells[1].Value,
                            }
                        )
                    } 
                }
            }
        }	
    }
	
	return rows
}



// exports 
exports.hds  = hds
exports.orgs = orgs
exports.COA  = COA
exports.generatePeriods = generatePeriods
exports.BalanceSheet = BalanceSheet