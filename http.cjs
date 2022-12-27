/** 
 * Grab JSON content from a URI and parse it to a javascript value
 * @param {string} uri 
 * @param {object} hds 
 * @param {string} auth 
 * @returns value
 */
exports.get  = (uri, hds=null, auth=null) => JSON.parse(xlc.get(uri, hds, auth).Result)
exports.post = (uri, content, hds=null, auth=null) => JSON.parse(xlc.post(uri, content, hds, auth).Result)
exports.put  = (uri, content, hds=null, auth=null) => JSON.parse(xlc.put(uri, content, hds, auth).Result)
exports.delete = (uri, hds=null, auth=null) => JSON.parse(xlc.delete(uri, hds, auth).Result)

