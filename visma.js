"use strict"

let http = require('http.js')

function getAllPages(uri, hds, progressMesage, auth='visma.net'){
	
	let all = []
	let pageNumber = 1 
	const pageSize = 1000 
	
	while(true){

		if(progressMesage) xlc.setProgressMessage(progressMesage + ` page ${pageNumber}`)
		
		const paramChar = uri.indexOf('?')===-1 ? '?' : '&'	
		const tmpUri = uri + `${paramChar}pageSize=${pageSize}&pageNumber=${pageNumber}`
		console.log(tmpUri)
		const batch = http.get(tmpUri, hds, auth)
		if(batch.length===0) break
		all = all.concat(batch)
		pageNumber++
	}
	
	return all 		
}

function account(){
	const uri = 'https://integration.visma.net/API/controller/api/v1/account'
	//return getAllPages(uri, null, 'Pulling Accounts') // doesn't seem to implement paging..
	return http.get(uri, null, 'visma.net')
}

function subAccount(){
	const uri = 'https://integration.visma.net/API/controller/api/v1/subaccount'
	//return getAllPages(uri, null, 'Pulling Accounts') // doesn't seem to implement paging..
	return http.get(uri, null, 'visma.net')
}


function generalLedgerBalanceV2(periodId){
	const uri = 'https://integration.visma.net/API/controller/api/v2/generalLedgerBalance?periodId=' + periodId
	return getAllPages(uri, null, 'Pulling GeneralLedger')
}

function salesOrder(){
	const uri = `https://integration.visma.net/API/controller/api/v1/salesorder`
	return getAllPages(uri, null, 'Pulling SalesOrders') 	
}

function purchaseOrder(){
	const uri = `https://integration.visma.net/API/controller/api/v1/purchaseorder`
	return getAllPages(uri, null, 'Pulling PurchaseOrders') 	
}

function inventory(){
	const uri = 'https://integration.visma.net/API/controller/api/v1/inventory'
	return getAllPages(uri, null, 'Pulling Inventory') 
}

exports.account 	= account
exports.subAccount 	= subAccount
exports.generalLedgerBalanceV2 = generalLedgerBalanceV2
exports.salesOrder 	= salesOrder
exports.purchaseOrder = purchaseOrder
exports.inventory 	= inventory
exports.getAllPages = getAllPages

