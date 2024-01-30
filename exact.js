"use strict"

function README(){

    /*
    Module for working with Exact Online API
    
    Several often used apis have been wrapped in functions to make them 
    easy to use with drag and drop. Note not all apis are wrapped, as that
    would create a large module where functions would be hard to find.

    The full api is described here: 
    https://start.exactonline.nl/docs/HlpRestAPIResources.aspx

    To use any of the other apis there are three options with reduced padding 
    for increased control: 

    1) Use the callAPi function. This function takes the api following the 
    '{division}/' part of the 'Resource URI' column in the docs.
    So if the Resource URI is:
    	/api/v1/{division}/activities/Complaints
    then call the api like this: 
        callAPi('activities/Complaints')

    2) Use the getAllPages function. CallApi above takes arguments 'select' 
    and 'filter' to build the uri. If you need to add other arguments like 
    $count or $top, then use getAllPages. This function takes the full uri
    and handles paging and stripping the OData metadata from the result:        
        getAllPages('https://start.exactonline.nl/api/v1/{division}/activities/Complaints?$count=true')

    3) use the http module or even xlc.get directly. You can always use the 
    http module or xlc.get directly to call any api. The http module is
        http = require('http.js')
        uri = 'https://start.exactonline.nl/api/v1/{division}/activities/Complaints'
        hds = { 'accept': 'application/json' }        
        http.get(uri, hds, 'exact')
    Please note that you will need to handle paging yourself. 

    */
}

const http = require('http.js')
const base = 'https://start.exactonline.nl/api/v1/'
const hds = { 'accept': 'application/json' }
let _defaultLoginAlias = null // enable multiple logins by allowing user to sepcify token alias

function Me(){
    const uri = base + 'current/Me'    
    let auth = 'exact' + (_defaultLoginAlias ? ':' + _defaultLoginAlias : '')
    console.log(auth)
    console.log(uri)
    return http.get(uri, hds, auth).d.results[0]   
}

let _currentDivision = 0 // division of the current user
function currentDivision(){
    if(!_currentDivision){
        _currentDivision = Me().CurrentDivision
    }  
    return _currentDivision  
}

// get and remember the current division
function Divisions(){
    const api = 'system/Divisions'
    const division=currentDivision()
    console.log(division)
    return callAPi(api, null, null, division)
}

function AllDivisions(){
    const api = 'system/AllDivisions'
    const division=currentDivision()
    console.log(division)
    return callAPi(api, null, null, division)
}

function GLAccounts(select=null, filter=null, division=null){
    return callAPi('financial/GLAccounts', select, filter, division)
}

function ProfitLossOverview(select=null, filter=null, division=null){
    return callAPi('read/financial/ProfitLossOverview', select, filter, division)[0]
}

function Journals(select='ReportingYear,ReportingPeriod,GLAccountCode,Amount', filter=null, division=null){
    return callAPi('financial/Journals', select, filter, division)
}

function ReportingBalance(select='ReportingYear,ReportingPeriod,GLAccountCode,Amount', filter=null, division=null){
    return callAPi('financial/ReportingBalance', select, filter, division)
}



exports.README = README
exports.Me = Me
exports.defaultLoginAlias = _defaultLoginAlias
exports.Divisions = Divisions
exports.AllDivisions = AllDivisions
exports.GLAccounts = GLAccounts
exports.ReportingBalance = ReportingBalance
exports.ProfitLossOverview = ProfitLossOverview
exports.Journals = Journals
exports.callAPi = callAPi
exports.getAllPages = getAllPages

function callAPi(api, select, filter, division, loginAlias){	
    
    // set default division
    if(!division) division = currentDivision()

    // build uri 
    let uri = base + `${division}/${api}`
    if(select) uri += `?$select=${select}`  
    if(filter) uri += `&$filter=${filter}`

    return getAllPages(uri, loginAlias)   
}

function getAllPages(uri, loginAlias){

    let alias = loginAlias || _defaultLoginAlias
    let auth = 'exact' + (alias ? ':' + alias : '')

    let tot = []
    while(true){
        console.log(uri)
        const result = http.get(uri, hds, auth).d // 
		
		// accumulate results
		const dat = result.results.map(({ __metadata, ...rest }) => rest) // remove __metadata
        tot.push(dat)
		
		// check for next page 
        if(!result.__next) break
        uri = result.__next
    }   

    return tot.flat()
}
