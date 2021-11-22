// var getServerInstance = ()=>{
// 	let targetUrl
// 	let url = location.origin + ""
// 	if(url.indexOf("lightning.force") != -1)
// 		targetUrl = url.substring(0, url.indexOf("lightning.force")) + "lightning.force.com"
// 	else if(url.indexOf("salesforce") != -1)
// 		targetUrl = url.substring(0, url.indexOf("salesforce")) + "salesforce.com"
// 	else if(url.indexOf("cloudforce") != -1)
// 		targetUrl = url.substring(0, url.indexOf("cloudforce")) + "cloudforce.com"
// 	else if(url.indexOf("visual.force") != -1) {
// 		let urlParseArray = url.split(".")
// 		targetUrl = 'https://' + urlParseArray[1] + ''
// 	}
// 	return targetUrl
// }
var getSessionHash = ()=>{
	try {
		let sId = document.cookie.match(regMatchSid)[1]
		return sId.split('!')[0] + '!' + sId.substring(sId.length - 10, sId.length)
	} catch(e) { if(debug) console.log(e) }
}
let getHTTP = function(targetUrl, type = "json", headers = {}, data = {}, method = "GET") {
	let request = { method: method, headers: headers }
	if(Object.keys(data).length > 0)
		request.body = JSON.stringify(data)
	return fetch(targetUrl, request).then(response => {
		apiUrl = response.url.match(/:\/\/(.*)salesforce.com/)[1] + "salesforce.com"
		switch(type) {
			case "json": return response.clone().json()
			case "document": return response.clone().text()
		}
	}).then(data => {
		if(typeof data == "string")
			return (new DOMParser()).parseFromString(data, "text/html")
		else
			return data
	})
}


const debug = false
const newTabKeys = [ "ctrl+enter", "command+enter", "shift+enter" ]
const regMatchSid = /sid=([a-zA-Z0-9\.\!]+)/
const SFAPI_VERSION = 'v49.0'
// const classicToLightingMap = {
// 	'Fields': "/FieldsAndRelationships/view",
// 	'Page Layouts': '/PageLayouts/view',
// 	'Lightning Record Pages': '/LightningPages/view',
// 	'Buttons, Links, and Actions': '/ButtonsLinksActions/view',
// 	'Compact Layouts': '/CompactLayouts/view',
// 	'Field Sets': '/FieldSets/view',
// 	'Limits': '/Limits/view',
// 	'Record Types': '/RecordTypes/view',
// 	'Related Lookup Filters': '/RelatedLookupFilters/view',
// 	'Search Layouts': '/SearchLayouts/view',
// 	'Triggers': '/Triggers/view',
// 	'Validation Rules': '/ValidationRules/view'
// }
const setupLabelsToUrlMap = {
// "Home": "/",
}