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

function sites() {
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

function drives(){
    // list the drives of the current site, use this to manually set the DriveId when automatic fails because there are mulitple Doc drives 
    let sites = get('https://graph.microsoft.com/v1.0/sites?search=*')        
    let site = sites.find(s => s.name === this._siteName);
    let drives = get(`https://graph.microsoft.com/v1.0/sites/${site.id}/drives`);
    return drives;
}

let _siteName = "Assign a Sharepoint SiteName, use drives() to list available sites";
let siteId = null;
let _driveName = "Assign a SharepointSit eName, use sites() to list available drives under that site";
let driveId = null;
let webUrl = null;

// make a property siteName with get/set methods, on set if should set the driveId to the first drive of that site
Object.defineProperty(exports, 'siteName', {
    get: function() {
        return this._siteName;
    },
    set: function(value) {        
        let sites = get('https://graph.microsoft.com/v1.0/sites?search=*')        
        let site = sites.find(s => s.name === value);
        if(site) {
            this._siteName = site.name; // set the siteName to the name of the site
            this.siteId = site.id; // set the siteId to the id of the
            this.webUrl = site.webUrl; // set the webUrl of the site
            let drives = get(`https://graph.microsoft.com/v1.0/sites/${site.id}/drives`);
            if(drives.length > 0) {
                let drive = drives.find(d => d.webUrl.toLowerCase().includes('doc')); // find the Document library drive
                if(!drive) {
                    throw new Error(`No Document library drive found for site ${site.name}, please assign the driveId manually using dl.driveId = 'driveId'`);                    
                } else { 
                    this.driveId = drive.id; // grab the id of the Document library drive
                    this._driveName = drive.name; // set the driveName to the name of the Document library drive
                    console.log(`Connected to site ${this._siteName} using drive ${this._driveName} (${this._driveId})}`);
                }
            }   
        } else {
            throw new Error(`Site ${value} not found, use sites() to list available sites`);
        }   
    },
    enumerable: true,
    configurable: false,
});

Object.defineProperty(exports, 'driveName', {
    get: function() {
        return this._driveName;
    },
    set: function(value) {        
        let drives = get(`https://graph.microsoft.com/v1.0/sites/${this.siteId}/drives`);
        if(drives.length > 0) {
            let drive = drives.find(d => d.name === value); // find the drive with the given name
            if(!drive) {
                throw new Error(`Drive ${value} not found for site ${this._siteName}, use drives() to list available drives`);                    
            } else { 
                this.driveId = drive.id; // grab the id of the Document library drive
                this._driveName = drive.name; // set the driveName to the name of the Document library drive
                console.log(`Connected to site ${this._siteName} using drive ${this._driveName} (${this._driveId})}`);
            }
        }          
    },
    enumerable: true,
    configurable: false,
});

exports.sites = sites;
exports.drives = drives;

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

