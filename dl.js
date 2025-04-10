"use strict";

const http = require('http.js')

function get(uri) {	
    // if the result is a single object, it will return that. 
    // If it is an OData array with paging, collect all value pages and return in one array
    let res = http.get(uri, null, 'spdl')
    if(res['@odata.nextLink']){
        let next = res['@odata.nextLink']
        while(next){
            let page = http.get(next, null, 'spdl')
            res.value = res.value.concat(page.value)
            next = page['@odata.nextLink']
        }
        return res.value
    } else {
        // if the result is a single object, it will return that. 
        // If it is an OData array with paging, collect all value pages and return in one array
        return res.value ?? res // if it is not an OData response, return the response as is
    }    
}


function list(path='', search=''){
    // get list of files in path
    let uri = path ? `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${path}:/children` : `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root/children`
    if(search) uri += `?$search=${search}`
    console.log(uri)
    const files =  get(uri)    
    return files.map(f => ({
        path : path == '' ? f.name : path + '/' + f.name,
        size : f.size,
        type : f.file ? 'file' : 'folder',
        createdBy : f.createdBy.user.email,
        created : f.createdDateTime,
        lastModifiedBy : f.lastModifiedBy.user.email,
        lastModified : f.lastModifiedDateTime,
        id : f.id
    }))
}

function versions(path){
    // list the versions of a certain file 

    let uri = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${path}:/versions`
    return get(uri)
}

function properties(path){
    // get properties of a file
    let uri = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${path}:/`
    return get(uri)
}

function propertiesP(paths){
    
    // get properties of a file
    if(!Array.isArray(paths) || paths.some(n => typeof n !== 'string' && !n.path)){
        throw new Error("Names must be an array of strings or objects with a path property")
    }

    // if names is an array of objects, convert to array of paths (strings)
    if(paths.some(n => typeof n !== 'string')){
        paths = paths.map(n => n.path ?? n)
    }
    
    // create graph batch request
    const uris = paths.map(name => `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${name}:/`)
    const calls = uris.map(uri => xlc.get(uri, null, 'spdl'))
    const results = calls.map(call => JSON.parse(call.Result))

    return results
}

function read(path){
    // read the contents of a file     
    // path can be a string or an object with a 'path' property (like the one row from dl.list())

    // validation: check that path is a string or an object with a path property
    if(typeof path !== 'string' && !path.path){
        throw new Error("Path must be a string or an object with a path property")
    }

    // if path is an object, convert to path (string)
    path = path.path ?? path

    let uri = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${path}:/content`
    //console.log(uri)
	return http.get(uri, null, 'spdl')
}

function readP(paths){
    // paths can be an array of either strings or any object with a 'path' property (like the output of dl.list())

    // validation: check that paths is an array of strings or objects with a path property
    if(!Array.isArray(paths) || paths.some(n => typeof n !== 'string' && !n.path)){
        throw new Error("Names must be an array of strings or objects with a path property")
    }

    // if names is an array of objects, convert to array of paths (strings)
    if(paths.some(n => typeof n !== 'string')){
        paths = paths.map(n => n.path ?? n)
    }

    // create graph batch request 
    const uris = paths.map(name => `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${name}:/content`)
    const calls = uris.map(uri => xlc.get(uri, null, 'spdl'))
    const results = calls.map(call => JSON.parse(call.Result))

    return results
}

function write(path, data){
	return http.put(`https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${path}:/content?$select=id,size`, data, null, 'spdl')
}

function writeP(paths, datas){

    // check that paths is an array of strings 
    if(!Array.isArray(paths) || paths.some(p => typeof p !== 'string')){
        throw new Error("Paths must be an array of strings")
    }

    // check that datas is an array
    if(!Array.isArray(datas)){
        throw new Error("Datas must be an array of values or nulls")
    }

    // check that paths and datas have the same length
    if(paths.length != datas.length){
        throw new Error("Paths and datas must have the same length")
    }

    // save files in parallel
    var requests = paths.map(path => `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${path}:/content?$select=id,size`)
    var calls = requests.map((request, i) => xlc.put(request, JSON.stringify(datas[i]), null, 'spdl'))
    var results = calls.map(call => JSON.parse(call.Result))

    return results
}

function setup() {
    let res = []
    xlc.setProgressMessage("Getting sites...")
    let sites = get('https://graph.microsoft.com/v1.0/sites?search=*')
    let progress = 0 
    for(let site of sites){
        // site = sites[0]
        
        // update user        
        xlc.setProgressMax(sites.length)
        xlc.setProgressMessage(`Getting drives for ${site.name}`)
        xlc.setProgressValue(++progress)

        // list drives for site
        let drives = get(`https://graph.microsoft.com/v1.0/sites/${site.id}/drives`)
        for(let drive of drives){
            res.push({
                driveId   : drive.id,
                driveName : drive.name,
                driveType : drive.driveType,
                siteId    : site.id,
                siteName  : site.name,
                //hostName  : site.siteCollection?.hostname
            })
        }
    }
    return res
}



exports.driveId = "PLEASE ASSIGN A DRIVE ID, USE setup() TO GET A LIST OF DRIVES AVAILABLE TO YOU";

exports.setup = setup;

exports.get = get;

exports.list = list;
exports.versions = versions;

exports.properties = properties;
exports.propertiesP = propertiesP;
exports.read = read;
exports.readP = readP;
exports.write = write;
exports.writeP = writeP;
