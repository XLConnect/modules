"use strict"

let http = require('http.js')
const v1Base = 'https://integration.visma.net/API/controller/api/v1/'
const v2Base = 'https://integration.visma.net/API/controller/api/v2/'
const apiBase = 'https://integration.visma.net/API/controller/api/'

function account(args=null, entity=null){
	return callAPi('v1/account', args, entity)
}

function subAccount(args=null, entity=null){
	return callAPi('v1/subaccount', args, entity)	
}

function financialPeriod(args=null, entity=null){
	return callAPi('v1/financialperiod', args, entity)	
}

function generalLedgerBalanceV2(args=null, entity=null){
	return callAPi('v2/generalLedgerBalance', args, entity)	
}

function salesOrder(args=null, entity=null){
	return callAPi('v1/salesorder', args, entity)	
}

function purchaseOrder(args=null, entity=null){
	return callAPi('v1/purchaseorder', args, entity)	
}

function inventory(args=null, entity=null){
	return callAPi('v1/inventory', args, entity)	
}

function journalTransactionV2(args=null, entity=null){
	return callAPi('v2/journaltransaction', args, entity)	
}

function README(){
	/*

	Visma.Net library to help you quickly grab your company data from the Visma.Net api.
	Please note this does not include all API's, only the often used ones.
	See the API full description here: https://integration.visma.net/API-index/
	The code should give an example how to call other API's if you need them.

	The functions all have a single argement 'args', which can be either: 

		1) omitted or null, in which case all records are returned. 
		visma.account() 
		calls https://integration.visma.net/API/controller/api/v1/account
		returns all accounts for this api 

		2) a single value, in which case that value is appended to the url as a path
		visma.account(123)
		calls https://integration.visma.net/API/controller/api/v1/account/123
		returns the account with id 123

		3) a javascript object, in which case the key-value combinations are appended to the url as query parameters
		visma.account({ active : true })
		calls https://integration.visma.net/API/controller/api/v1/account?active=true
		returns all active accounts

	Please note that is you need to call an api that does not yet have a wrapper 
	you can create the uri and call http.get() directly:

		uri = 'https://integration.visma.net/API/controller/api/v1/account'
		http.get(uri, null, 'visma.net')

	If you do, please take note that some API's implement paging, for those you can use the getAllPages() function

	*/
}

exports.README 			= README
exports.account 		= account
exports.financialPeriod = financialPeriod
exports.subAccount 		= subAccount
exports.generalLedgerBalanceV2 = generalLedgerBalanceV2
exports.salesOrder 		= salesOrder
exports.purchaseOrder 	= purchaseOrder
exports.inventory 		= inventory
exports.journalTransactionV2 = journalTransactionV2

exports.callAPi 		= callAPi
exports.buildUri 		= buildUri
exports.getAllPages 	= getAllPages

function callAPi(api, args, entity){	
	const uri = buildUri(apiBase + api, args) 					// expand args to uri
	const auth = 'visma.net' + (entity ? ':' + entity : '') 	// add entity to auth if present
	return getAllPages(uri, null, 'Pulling ' + api, auth)		// get all pages
}

function buildUri(uri, args) {

	if (args) {		
		if (typeof args === 'object') { // loop object and add to uri as query parameters 			
			let query = Object
				.entries(args)
				.map(([key, value]) => key + '=' + value)
				.join('&')	
			return uri + (query.length > 0 ? '?' + query : '')					
		} else {			
			return uri += '/' + args // add value to uri as path
		}
	} 
	
	return uri		
}

function getAllPages(uri, hds, progressMesage, auth='visma.net'){
	// helper function to get all pages for an api if that implements paging

	let all = []
	let pageNumber = 1 
	const pageSize = 1000 
	
	while(true){

		if(progressMesage) xlc.setProgressMessage(progressMesage + (pageNumber > 1 ? ` page ${pageNumber}` : ''))
		
		const paramChar = uri.indexOf('?')===-1 ? '?' : '&'	
		const tmpUri = uri + `${paramChar}pageSize=${pageSize}&pageNumber=${pageNumber}`	// just add paging to all calls, they get ignored if not implemented
		console.log(tmpUri)
		const batch = http.get(tmpUri, hds, auth)
		
		// check paging 	
		if(!Array.isArray(batch)) return batch; // we got no array back, so no paging (or error	)
		
		all = all.concat(batch)
		if(batch.length === 0) return all 		; 	// we got no records, so no more pages 
		if(batch[0].metadata){			// for paged apis every batch has a metadata element
			if(batch[0].metadata.totalCount < pageNumber * pageSize) return all 		 // we got all pages 
		} else {
			return batch 				// we got no metadata element so no paging 
		} 

		pageNumber++ 					// next page		

	}	
}