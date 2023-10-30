"use strict"

const http = require('http.js')
const baseUri = 'https://api.hubapi.com/crm/v3/objects/'

function deals(){
    return callAPi('deals')
}
function companies(){
    return callAPi('companies')
}
function contacts(){
    return callAPi('contacts')
} 

function patchDeal(dealId, properties){
    let uri =  baseUri + `/deals/${dealId}`
    let patchDeal = { 
        properties : properties
    }
    return http.patch(uri, patchDeal, null, 'hubspot')
}

function deleteDealLineItems(dealId){
    const uri = baseUri + `/deals/${dealId}/associations/line_items`
    const lines = http.get(uri, null, 'hubspot')
    for(const line of lines.results){
        xlc.delete(baseUri + `line_items/${line.id}`, null, 'hubspot')
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
	for(const line of lines){
		if(!line.name) throw 'line.name is required: ' + JSON.stringify(line)
		//if(!line.price) throw 'line.price is required: ' + JSON.stringify(line)
		if(!line.quantity) throw 'line.quantity is required: ' + JSON.stringify(line)
	}

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

	// write lines 
	const linesUri =  `https://api.hubapi.com/crm/v3/objects/line_item`
	for(const line of dealLines){	
		const x = http.post(linesUri, line, null, 'hubspot').Result
	}
}

exports.deals 		= deals
exports.companies 	= companies
exports.contacts 	= contacts
exports.patchDeal 	= patchDeal
exports.deleteDealLineItems = deleteDealLineItems
exports.writeDealLineItems = writeDealLineItems
exports.callAPi 	= callAPi

function callAPi(api){

	// variables
	let result = []
	let after  = null
	
	// keep going until no more next page 
	while(true) {
		
		// construct uri
		let uri = baseUri + '/' + api +  '?limit=100'
		if(after) uri += '&after=' + after
	
		// call api and aggregate intermediate results
        console.log(uri) 
		let batch = http.get(uri, null, 'hubspot')
		result = result.concat(batch.results)	
		
		// see if there's a next page 
		if(batch.paging) 
			after = batch.paging.next.after
		else 
			break;
	}
	
	return result
}