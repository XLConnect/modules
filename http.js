function head(uri, hds = null, auth = null){
    let res = xlc.head(uri, hds, auth).Result
    return JSON.parse(res)
}

function get(uri, hds = null, auth = null){
    let res = xlc.get(uri, hds, auth).Result
    return JSON.parse(res)
}

function post (uri, content, hds = null, auth = null){
    let j = JSON.stringify(content)
    let res = xlc.post(uri, j, hds, auth).Result
    return parseResult(res)
}

function put (uri, content, hds = null, auth = null){
    let j = JSON.stringify(content)
    let res = xlc.put(uri, j, hds, auth).Result
    return parseResult(res)
}

function patch (uri, content, hds = null, auth = null){
    let j = JSON.stringify(content)
    let res = xlc.patch(uri, j, hds, auth).Result
    return parseResult(res)
}

// delete already exists as a reserved word in js
function fdelete(uri, hds = null, auth = null){
    let res = xlc.delete(uri, hds, auth).Result
    return parseResult(res)
}

function http(verb, uri, content, hds, auth){
    let j = content ? JSON.stringify(content) : null
    let res = xlc.http(verb, uri, j, hds, auth).Result
    return parseResult(res)
}

function parseResult(res){    
    if(res.trim() === "") return "" // empty string does not parse as valid json (but should)
    return JSON.parse(res)
}

exports.get = get
exports.put = put
exports.post = post
exports.patch = patch
exports.delete = fdelete
exports.head = head
exports.http = http


//exports.head = head

