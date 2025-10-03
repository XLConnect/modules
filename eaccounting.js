"use strict";

const util = require('util.js')
const http = require('http.js')

const base = 'https://eaccountingapi.vismaonline.com'
const auth = 'eaccounting' // TODO : implement named cookies 

function README(){

}

function accounts(){
    return call('/v2/Accounts')
}

function accountTypes(){
	return call('/v2/AccountTypes')
}

function accountBalances(date){
    let date2 = util.YYYY_MM_DD(date)
    return call(`/v2/AccountBalances/${date2}`)
}

function articles(){
	return call('/v2/Articles')
}

function companySettings(){
	return call('/v2/CompanySettings')
}

function costCenters(){
	return call('/v2/CostCenters')
}

function customers(){
    return call('/v2/Customers')
}

function customerInvoices(){
    return call('/v2/CustomerInvoices')
}

function suppliers(){
    return call('/v2/Suppliers')
}

function supplierInvoices(){
    return call('/v2/SupplierInvoices')
}

function call(api){
	
	let firstSep = api.includes('&') ? '&' : '?'
	let page = 1
	let pageSize = 1000
		
	let pages = []
	while(true){
		let uri2 = base + api + firstSep + `$page=${page}&$pagesize=${pageSize}`
		console.log(uri2)
		let res = http.get(uri2, null, auth)	
		if(res.Meta){
            // paginated response , collect all pages 
			pages.push(res.Data)
			if(res.Meta.CurrentPage < res.Meta.TotalNumberOfPages){
				page++			
			} else {
				break
			}
		} else { 
            // not paginated, just return result 
			return res
		}		
	}
	return pages.flat()
}

exports.README = README

exports.accounts = accounts
exports.accountTypes = accountTypes
exports.accountBalances = accountBalances
exports.articles = articles
exports.companySettings = companySettings
exports.costCenters = costCenters
exports.customers = customers
exports.customerInvoices = customerInvoices
exports.supplierInvoices = supplierInvoices
exports.suppliers = suppliers

exports.call = call