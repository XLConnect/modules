"use sctrict"

http = require('http')

let accountId = null 

function accounts() { return callApi('accounts') }   
function accountCodes() { return callApi('account-codes') } 
function cards() { return callApi('cards') }    
function expenses() { return callApi('expenses') }
function fundAccounts() { return callApi('fund-accounts') }
function suppliers() { return callApi('expenses') }
function taxRates() { return callApi('tax-rates') }
function teams () { return callApi('teams') }

function callApi(api) {    
    let uri = 'https://api.payhawk.io/api/v3/accounts/'+ accountId +'/' + api
    return http.get(uri, null, 'payhawk').items 
}

// exports 

// wrappers 
exports.accounts = accounts
exports.accountCodes = accountCodes
exports.cards = cards
exports.expenses = expenses
exports.fundAccounts = fundAccounts
exports.suppliers = suppliers
exports.taxRates = taxRates
exports.teams = teams

// internals 
exports.setAccountId = (id) => { accountId = id }
exports.callApi = callApi


