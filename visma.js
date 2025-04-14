"use strict"

let http = require('http.js')

const apiBase = 'https://api.finance.visma.net/API/controller/api/'

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
	Please note that the most often used api's are wrapped in helper functions you can drag and drop into your code.
	For instance, to get all accounts you can simply call:

		salesOrders = visma.salesOrder()
		salesOrders = visma.salesOrder(123) 				// a single value is appended to the url as a path
		salesOrders = visma.salesOrder({ status : 'Open' }) // pass in query parameters with an object
		
	You can also call this same api (and all others) directly using callAPI, for instance:
	
		salesOrders = visma.callAPI('v1/salesorder')
		salesOrders = visma.callAPI('v1/salesorder', 123)
		salesOrders = visma.callAPI('v1/salesorder', { status : 'Open' })
	
	Browse the spec in Javascript Studio to see all API's, their parameters and DTO formats:

		spec = visma.swaggerSpec()

	Same API docs in Swagger GUI here: https://integration.visma.net/API-index/
	
	The wrapper functions all have a single argement 'args', which can be either: 

		1) omitted or null, in which case all records are returned. 
		visma.account() 
		calls https://integration.visma.net/API/controller/api/v1/account
		returns all accounts for this api 

		2) a single value, in which case that value is appended to the url as a path
		visma.account(123)
		calls https://integration.visma.net/API/controller/api/v1/account/123
		returns the account with id 123

		3) an object, in which case the key-value combinations are appended to the url as query parameters
		visma.account({ active : true })
		calls https://integration.visma.net/API/controller/api/v1/account?active=true
		returns all active accounts

	Please note that if you want to call an api that does not yet have a wrapper you can use callAPI: 

		visma.callAPI('v1/account', { active : true })
		This is litterally how the other wrappers are implemented, we only did the most common ones to not clutter the code.

	Or, if you prefer to build the uri yourself, you can use getAllPages() to get all pages for an api that implements paging:

		visma.getAllPages('https://integration.visma.net/API/controller/api/v1/account', null, 'Pulling accounts')
	
	Finally, you can also call the API's directly using http.get() or even raw xlc.get() if you need complete control. Please note you will need to implement paging yourself. 

		uri = 'https://integration.visma.net/API/controller/api/v1/account'
		http.get(uri, null, 'visma.net')
		http.http('get', uri, null, 'visma.net') 	// this gives you access to the reply headers 

		xlc.get(uri, null, 'visma.net').Result 		// this gives you access to the raw reply, this can be useful is the reply is not valid json like ""
		xlc.http('get', uri, null, 'visma.net') 	// same but with the headers 

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

exports.apiBase 		= apiBase
exports.callAPi 		= callAPi
exports.buildUri 		= buildUri
exports.getAllPages 	= getAllPages
exports.swaggerSpec 	= swaggerSpec
exports.clientCredentials = clientCredentials
exports.clientCredentialsStaging = clientCredentialsStaging


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

		//if(progressMesage) xlc.setProgressMessage(progressMesage + (pageNumber > 1 ? ` page ${pageNumber}` : ''))
		
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

function swaggerSpec(){

/*
	Returns the swagger spec of the Visma api from https://integration.visma.net/API-index/doc/swagger
	this allows you to browse (and sort, click on the name column) the spec and see the required dto formats 

	recommended usage (paste into code window and execute line by line with F8)
		spec = visma.swaggerSpec()
		spec.paths['/controller/api/v2/salesorder'].post

		// if you look here for instance
		spec.paths['/controller/api/v2/salesorder'].post.parameters[0].schema.$ref

		// it will show the dto type 
		"#/definitions/SalesOrderUpdateDto"

		// then that type can be found here (change the / to . )
		spec.definitions.SalesOrderUpdateDto

		// the DtoValueOfXXx types ...
		spec.definitions.DtoValueOfInt16

		// ... mean they should be entered like this: 
		{
			value : 123
		}
*/

	return http.get('https://integration.visma.net/API-index/doc/swagger')

}

function clientCredentials(client_id, client_secret, tenant_id, scope){	
	const uri = 'https://connect.visma.com/connect/token'
	const headers = { 'content-type' : 'application/x-www-form-urlencoded' }
	const content = `grant_type=client_credentials&scope=${scope}&client_id=${client_id}&client_secret=${client_secret}&tenant_id=${tenant_id}`
	const resj = xlc.post(uri, content, headers).Result
	const res = JSON.parse(resj)	
	return res
}

function clientCredentialsStaging(client_id, client_secret, tenant_id, scope){	
	const uri = 'https://connect.identity.stagaws.visma.com/connect/token'
	const headers = { 'content-type' : 'application/x-www-form-urlencoded' }
	const content = `grant_type=client_credentials&scope=${scope}&client_id=${client_id}&client_secret=${client_secret}&tenant_id=${tenant_id}`
	const resj = xlc.post(uri, content, headers).Result
	const res = JSON.parse(resj)	
	return res
}

