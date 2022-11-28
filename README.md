# xlc
Public javascript modules for the XLConnect platform. 
[XLConnect](https://www.xlconnect.net) is an add-in to Excel that adds cloudconnetivity and a datalake to Excel, turning it into a flexible and effective app development platform. 

## How to use 
In javascript code, use 

`http = require('https://github.com/gjvdkamp/xlc/http.cjs')`

to add a module to your code, the use 

`fx_data = http.get('https://au.xlw.io/Public/msv/7fn6vy')`

to grab some smaple fx data from the datalake and use it a script. See [here](http://docs.xlconnect.net/javascript/) for more detail.

## How to get XLConnect 
See [here](http://docs.xlconnect.net/) on how to create an account and download the add-in 

## In thos repository
This online repo contains the following modules:
* `http` contains wrapper functionwsto streamline working with http requests 
* `file` contains wrapper functions to streamline working with data files in the data lake 
* `xero` contains building blocks to build on the Xero API 

