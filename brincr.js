"use sctrict";

const http = require('http.js')

function getAllPages(uriBase, auth, limit = 200) {
	
	let result = []
	let paramStart = uriBase.includes('?') ? '&' : '?'
	let uri = uriBase + paramStart + 'limit=' + limit
		
	while(true){
	    console.log(uri)
		
		response = http.http('GET', uri, null, null, auth)
	
		// rate limit
		rem = Number(response.Headers['X-RateLimit-Remaining'])
		//console.log(rem)
		if(rem < 5){
			xlc.setProgressMessage('5 sec pauze voor API Rate limit...')
			xlc.sleep(5000) // 5 sec wachten 
			xlc.setProgressMessage('Fetching data...')
		}

	    //let res = http.get(uri, null, auth)
		let res = JSON.parse(response.Content)
	    result.push(res.data)
	    if(res.links?.next){
	   		uri = res.links?.next
	    } else {
	        return result.flat()
	    }
	}
}

exports.getAllPages = getAllPages
