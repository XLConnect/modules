// other libs 
http = require ('http.cjs')

// constants
const baseURL = 'https://api.xero.com/api.xro/2.0/'

const hds = (tenantId) => ({'xero-tenant-id' : tenantId})

// exported functions 
exports.orgs = () => http.get('https://api.xero.com/connections', null, 'xero').sort((a, b) => a.tenantName > b.tenantName ? 1 : -1)
exports.COA  = (tenantId) => {
    let h = hds(tenantId)    
    let uri = baseURL + 'Accounts'
    return http.get(uri, h, 'xero')
}
