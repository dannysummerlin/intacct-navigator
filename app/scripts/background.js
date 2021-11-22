var setupTree = {}
var metaData = {}
var customObjects = {}

const showElement = (element)=>{
	chrome.tabs.query({currentWindow: true, active: true}, (tabs)=>{
		switch(element) {
			// case "appMenu":
			// 	chrome.tabs.executeScript(tabs[0].id, {code: 'document.getElementsByClassName("appLauncher")[0].getElementsByTagName("button")[0].click()'})
			// 	break
			case "searchBox":
				chrome.tabs.executeScript(tabs[0].id, {code: `
					document.getElementById("nav_searchBox").style.zIndex = 9999
					document.getElementById("nav_searchBox").style.opacity = 0.98
					document.getElementById("nav_quickSearch").focus()
				`})
				break
		}
	})
}
var goToUrl = (targetUrl, newTab)=>{
	targetUrl = targetUrl.replace(/chrome-extension:\/\/\w+\//,"/")
	chrome.tabs.query({currentWindow: true, active: true}, (tabs)=>{
		let newUrl = targetUrl.match(/.*?\.com(.*)/)
		newUrl = newUrl ? newUrl[1] : targetUrl
		if(newTab)
			chrome.tabs.create({ active: false, url: tabs[0].url.match(/.*?\.com/)[0] + newUrl})
		else
			chrome.tabs.update(tabs[0].id, { url: tabs[0].url.match(/.*?\.com/)[0] + newUrl})
	})
}

chrome.commands.onCommand.addListener((command)=>{
	switch(command) {
		case 'showSearchBox': showElement("searchBox"); break
		// case 'showAppMenu': showElement("appMenu"); break
		// case 'goToTasks': goToUrl(".com/00T"); break
		// case 'goToReports': goToUrl(".com/00O"); break
	}
})
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>{
	if (request.action == "getApiSessionId") {
		if (request.key != null) {
			request.sid = request.uid = request.domain = ""
			chrome.cookies.getAll({}, (all)=>{
				all.forEach((c)=>{
					if(c.domain.includes("salesforce.com") && c.value.includes(request.key) && c.name == "sid") {
						request.sid = c.value
						request.domain = c.domain
					}
				})
				if(request.sid != "") {
					getHTTP("https://" + request.domain + '/services/data/' + SFAPI_VERSION, "json",
						{"Authorization": "Bearer " + request.sid, "Accept": "application/json"}
					).then(response => {
						request.uid = response.identity.match(/005.*/)[0]
						sendResponse({sessionId: request.sid, userId: request.uid, apiUrl: request.domain})
					})
				}
				else sendResponse({error: "No session data found for " + request.key})
			})
		} else sendResponse({error: "Must include orgId"})
	}
	switch(request.action) {
		case 'goToUrl': goToUrl(request.url, request.newTab); break
		case 'createTask':
			getHTTP("https://" + request.apiUrl + "/services/data/" + SFAPI_VERSION + "/sobjects/Task",
				"json", {"Authorization": "Bearer " + request.sessionId, "Content-Type": "application/json" },
				{"Subject": request.subject, "OwnerId": request.userId}, "POST")
			.then(function (response) { sendResponse(response) })
			break
		case 'searchLogins':
			getHTTP("https://" + request.apiUrl + "/services/data/" + SFAPI_VERSION + "/tooling/query/?q=SELECT+Id,+Name,+Username+FROM+User+WHERE+Name+LIKE+'%25" + request.searchValue + "%25'+OR+Username+LIKE+'%25" + request.searchValue + "%25'", "json", {"Authorization": "Bearer " + request.sessionId, "Content-Type": "application/json" })
			.then(function(success) { sendResponse(success) }).catch(function(error) {
				console.log(error)
			})
	}
	return true
})