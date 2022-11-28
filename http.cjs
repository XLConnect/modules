exports.get = (uri, hds=null, auth='xlc') => JSON.parse(xlc.get(uri, hds, auth).Result)
