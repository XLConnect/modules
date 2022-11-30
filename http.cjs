/** 
 * Grab JSON content from a URI and parse it to a javascript value
 * @param {string} uri 
 * @param {object} hds 
 * @param {string} auth 
 * @returns value
 */
exports.get = (uri, hds=null, auth='xlc') => JSON.parse(xlc.get(uri, hds, auth).Result)
