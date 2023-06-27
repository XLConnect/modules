function read(path){
    var json = xlc.fileRead(path)
    return JSON.parse(json)
}

function write(path, item){
    json = JSON.stringify(item)
    xlc.fileWrite(path, json)
}

function fdelete(path){
    xlc.fileDelete(path)
}

function list(path, filter='*.*', subfolders=false){
    // path is the path (starting from the XLConnect Data folder) 
    // filter can have be wildcards like '*.json' or '2023-??.json', null 
    // subfolders specifies is the search should include all folders below path
    return xlc.fileList(path, filter, subfolders)
}

function folderDelete(path, force = false){
    // for force = false, folder must be empty. Use true to delete the folder and it's contents 
    xlc.folderDelete(path, force)
}

exports.read = read
exports.write = write 
exports.delete = fdelete
exports.list = list
exports.folderDelete = folderDelete