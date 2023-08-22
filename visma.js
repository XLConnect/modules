
function getAllPages(uri, progressMessage=null){

	// internal function to get all pages for a particular uri
    // uri : uri to get 
    // progressMessage : will be shown to user as progressStart + `page ${pageNumber}

	all = []
	pageNumber = 1 
	pageSize = 1000 
	
	while(true){
		
        if(progressMessage) xlc.setProgressMessage(progressMessage + ` page ${pageNumber}`)
		
		let tmpUri = uri + `&pageSize=${pageSize}&pageNumber=${pageNumber}`
		console.log(tmpUri)
		batch = http.get(tmpUri, null, 'visma.net')
		if(batch.length===0) break
		all = all.concat(batch)
        
		pageNumber++
	}
	
	return all 
		
}


