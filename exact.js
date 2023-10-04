"use strict"

const http = require('http.js')

const base = 'https://start.exactonline.nl/api/v1/'
const hds = { 'accept': 'application/json' }

function Me(){
    const uri = base + 'current/Me'
    return http.get(uri, hds, 'exact').d.results[0]   
}

let _currentDivision = 0 // division of the current user
function currentDivision(){
    if(!_currentDivision){
        _currentDivision = Me().CurrentDivision
    }    
    return _currentDivision
}

function Divisions(){
    const uri = base + `${currentDivision()}/system/Divisions`
    return http.get(uri, hds, 'exact').d.results.map(({ __metadata, ...rest }) => rest)    
}

function GLAccounts(select=null, filter=null, division=currentDivision()){
    return callAPi('financial/GLAccounts', select, filter, division)
}

function ProfitLossOverview(select=null, filter=null, division=currentDivision()){
    return callAPi('read/financial/ProfitLossOverview', select, filter, division)[0]
}

function Journals(select=null, filter=null, division=currentDivision()){
    return callAPi('financial/Journals', select, filter, division)
}

exports.Me = Me
exports.Divisions = Divisions
exports.GLAccounts = GLAccounts
exports.ProfitLossOverview = ProfitLossOverview
exports.Journals = Journals


function callAPi(api, select, filter, division){	
    let uri = base + `${division}/${api}`
    if(select) uri += `?$select=${select}`  
    if(filter) uri += `&$filter=${filter}`
    return http.get(uri, hds, 'exact').d.results.map(({ __metadata, ...rest }) => rest)
}
