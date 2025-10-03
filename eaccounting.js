function README(){

}

const base = 'https://eaccountingapi.vismaonline.com'
const auth = 'eaccounting'

function call(api){
	
	let firstSep = api.includes('&') ? '&' : '?'
	let page = 1
	let pageSize = 1000
		
	let pages = []
	while(true){
		let uri2 = base + api + firstSep + `$page=${page}&$pagesize=${pageSize}`
		console.log(uri2)
		let res = http.get(uri2, null, auth)	
		if(res.Meta){ // paginated response , collect all pages 
			pages.push(res.Data)
			if(res.Meta.CurrentPage < res.Meta.TotalNumberOfPages){
				page++			
			} else {
				break
			}
		} else { // not paginated, just return result 
			return res
		}		
	}
	return pages.flat()
}





exports = {
    README,
    call
}