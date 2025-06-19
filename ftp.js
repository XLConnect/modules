function connect(server, port, username, password) {
    console.log(`Connecting to FTP server at ${server}:${port}...`);
    xlc.connect(server, port, username, password);
    return `Connected to ${server} on port ${port}`;
}

function disconnect() {
    console.log("Disconnecting from FTP server...");
    xlc.disconnect();
    return "Disconnected from FTP server";
}

function get(path) {
    console.log(`Getting file from path: ${path}`);    
    return JSON.parse(xlc.ftpGet(path))
}

function getRaw(path) {
    return xlc.ftpGet(path);    
}

function put(path, jsonData) {
    console.log(`Putting file to path: ${path}`);
    return xlc.ftpPut(path, JSON.stringify(jsonData));
}

function putRaw(path, rawData) {
    return xlc.ftpPut(path, rawData);
}

function list(directory) {
    console.log(`Listing files in directory: ${directory}`);
    return xlc.ftpList(directory);
}

function fdelete(path) {
    console.log(`Deleting file: ${path}`);
    return xlc.ftpDelete(path);
}

outputs = {
    connect,
    disconnect,
    get,
    getRaw,
    put,
    putRaw,
    list,
    delete: fdelete
}