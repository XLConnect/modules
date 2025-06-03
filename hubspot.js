"use strict"

const http = require('http.js')
const baseURL = 'https://api.hubapi.com/'

function deals(args=null){
    return callAPi('crm/v3/objects/deals', args)
}
function companies(args=null){
    return callAPi('crm/v3/objects/companies', args)
}
function contacts(args=null){
    return callAPi('crm/v3/objects/contacts', args)
} 

function line_items(args=null){
	return callAPi('crm/v3/objects/line_items', args)
}

function quotes(args=null){
	return callAPi('crm/v3/objects/quotes', args)
}


function schemas(args=null){
	return callAPi('crm/v3/schemas', args)
}

function patchDeal(dealId, properties){
    let uri =  baseURL + `crm/v3/objects/deals/${dealId}`
    let patchDeal = { 
        properties : properties
    }
    return http.patch(uri, patchDeal, null, 'hubspot')
}

function deleteDealLineItems(dealId){
    const uri = baseURL + `crm/v3/objects/deals/${dealId}/associations/line_items`
    const lines = http.get(uri, null, 'hubspot')
    for(const line of lines.results){
		
        xlc.delete(baseURL + 'crm/v3/objects/line_items/' + line.id, null, 'hubspot')
    }
}

function writeDealLineItems(dealId, lines){
	// lines should have the following format
	// [{ name : 'myname', price : 123.45, quantity : 5 }, ...]
	// more info: https://developers.hubspot.com/docs/api/crm/line-items

	// validate inputs 
	if(!dealId) throw 'dealId is required'
	if(!lines) throw 'lines is required'
	if(!Array.isArray(lines)) throw 'lines must be an array'
	if(lines.length == 0) throw 'lines must have at least one element'	
	/*
	for(const line of lines){
		if(!line.name) throw 'line.name is required: ' + JSON.stringify(line)
		//if(!line.price) throw 'line.price is required: ' + JSON.stringify(line)
		//if(line.quantity == null) throw 'line.quantity is required: ' + JSON.stringify(line)
	}
*/
	// convert lines to hubspot format
	const dealLines = lines.map((l, i) => ({
		"properties": {
			...l, // spread whetever was passed
			hs_position_on_quote : i // fix position in the quote
		},
		"associations": [
			{
				"to": { 
					"id": dealId
				},
				"types": [
					{
					"associationCategory": "HUBSPOT_DEFINED",
					"associationTypeId": 20
					}
				]
			}
		]
	}))
	console.log(dealLines)
	// write lines 
	const linesUri =  baseURL + 'crm/v3/objects/line_item'
	for(const line of dealLines){	
		const x = http.post(linesUri, line, null, 'hubspot').Result
	}
}

exports.deals 		= deals
exports.companies 	= companies
exports.contacts 	= contacts
exports.line_items 	= line_items
exports.quotes 		= quotes
exports.schemas 	= schemas

exports.patchDeal 	= patchDeal
exports.deleteDealLineItems = deleteDealLineItems
exports.writeDealLineItems = writeDealLineItems

exports.spec 		= spec
exports.baseURL 	= baseURL
exports.callAPi 	= callAPi
exports.buildUri 	= buildUri

function callAPi(api, args){

	// variables
	let result = []

	// construct uri
		let uri = buildUri(api, args)
	
	// keep going until no more next page 
	while(true) {		
	
		// call api and aggregate intermediate results
        console.log(uri) 
		let batch = http.get(uri, null, 'hubspot')
		if(!batch.results) return batch // no array means no paging 
		result.push(batch.results)	
		
		// see if there's a next page 
		if(batch.paging) 
			uri = batch.paging.next.link
		else 
			break;
	}
	
	return result.flat()
}

function buildUri(api, args) {

	let uri = baseURL + api //+  '?limit=100'

	if (args) {		
		if (typeof args === 'object') { // loop object and add to uri as query parameters 
			args.limit = 100			
			let query = Object
				.entries(args)
				.map(([key, value]) => key + '=' + value)
				.join('&')	
			return uri + (query.length > 0 ? '?' + query : '')					
		} else {			
			return uri += '/' + args // add value to uri as path
		}
	} 
	
	return uri + '?limit=100'
	
}


function spec(){
	return http.get('https://api.hubspot.com/api-catalog-public/v1/apis')
}