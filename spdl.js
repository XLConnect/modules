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
        name : f.name,
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

function downloadBinary(remotePath, localPath){
    // read the contents of a file as binary data
    // path can be a string or an object with a 'path' property (like the one row from dl.list())

    // validation: check that path is a string or an object with a path property
    if(typeof remotePath !== 'string' && !remotePath.path){
        throw new Error("remotePath must be a string or an object with a property 'path'")
    }

    // if path is an object, convert to path (string)
    let path = remotePath.path ?? remotePath

    let uri = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${path}:/content`
    let res = xlc.downloadBinary(uri, localPath, 'spdl').Result
    return localPath
}

function uploadBinary(remotePath, localpath, headers = null){
    // write string to sharepoint 
    let uri = `https://graph.microsoft.com/v1.0/drives/${this.driveId}/root:/${remotePath}:/content?$select=id,size`
    console.log(uri)
    let res = xlc.uploadBinary(uri, localpath, headers, 'spdl').Result 
    return remotePath
}

function setup() {
    let res = []
    xlc.setProgressMessage("Getting sites...")
    let sites = get('https://graph.microsoft.com/v1.0/sites?search=*')
    return sites.map(site => ({
        name: site.name,
        displyName : site.displayName,
        description : site.description,
        webUrl : site.webUrl
    }))
}

let _siteName = "Assign a Sharepoint SiteName, use setup() to list available sites";
let _driveId = null;
let webUrl = null;

// make a property siteName with get/set methods, on set if should set the driveId to the first drive of that site
Object.defineProperty(exports, 'siteName', {
    get: function() {
        return this._siteName;
    },
    set: function(value) {
        this._siteName = value;
        let sites = get('https://graph.microsoft.com/v1.0/sites?search=*')        
        let site = sites.find(s => s.name === value);
        if(site) {
            this.webUrl = site.webUrl; // set the webUrl of the site
            let drives = get(`https://graph.microsoft.com/v1.0/sites/${site.id}/drives`);
            if(drives.length > 0) {
                this.driveId = drives.find(d => d.webUrl.toLowerCase().includes('doc')).id; // grab the id of the Document library drive
                console.log(`Connected to site ${site.name} using driveId ${this.driveId}`);
            }   
        } else {
            throw new Error(`Site ${value} not found`);
        }   
    },
    enumerable: true,
    configurable: false,
});

exports.setup = setup;

exports.list = list;
exports.read = read;
exports.readP = readP;
exports.downloadBinary = downloadBinary;

exports.write = write;
exports.writeP = writeP;
exports.uploadBinary = uploadBinary;

exports.versions = versions;
exports.properties = properties;
exports.propertiesP = propertiesP;

