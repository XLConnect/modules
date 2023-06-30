function read(path){
    var json = xlc.fileRead(path)
    return JSON.parse(json)
}

function write(path, item){    
    // item: can be any javascript variable, string, int, object, array etc
    json = JSON.stringify(item)
    xlc.fileWrite(path, json)
}

// delete is reserved word in js, so added f for function
function fdelete(path){
    xlc.fileDelete(path)
}

function list(path, filter='*.*', subfolders=false){
    // path: the path to list files from (starting from the XLConnect Data folder) 
    // filter: can have be wildcards like '*.json' or '2023-??.json', null 
    // subfolders: search includes all folders below path
    return xlc.fileList(path, filter, subfolders)
}

function folderDelete(path, force = false){
    // path: the path to list files from (starting from the XLConnect Data folder) 
    // force: if false, folder must be empty to succeed. Use true to delete the folder and any contents 
    xlc.folderDelete(path, force)
}

exports.read = read
exports.write = write 
exports.delete = fdelete
exports.list = list
exports.folderDelete = folderDelete