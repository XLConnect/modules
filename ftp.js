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

function read(path) {
    console.log(`Getting file from path: ${path}`);    
    return JSON.parse(xlc.ftpGet(path))
}

function readRaw(path) {
    return xlc.ftpGet(path);    
}

function write(path, jsonData) {
    console.log(`Putting file to path: ${path}`);
    return xlc.ftpPut(path, JSON.stringify(jsonData));
}

function writeRaw(path, rawData) {
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

exports = {
    connect,
    disconnect,
    read,
    readRaw,
    write,
    writeRaw,
    list,
    delete: fdelete
}