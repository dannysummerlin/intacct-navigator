const getSessionID = ()=>{
	// do I need to check anything in document.cookie?
	return window.location.search.match(/\.sess=(.*)&*/)[1]
}

let getHTTP = function(targetUrl, type = "json", headers = {}, data = {}, method = "GET") {
	let request = { method: method, headers: headers }
	if(Object.keys(data).length > 0)
		request.body = JSON.stringify(data)
	return fetch(targetUrl, request).then(response => {
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
const setupLabelsToUrlMap = {
	// "Home": "/",
}