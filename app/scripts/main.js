// @copyright 2012+ Daniel Nakov / Silverline CRM
// http://silverlinecrm.com
// @copyright 2019+ Danny Summerlin
// var orgId = null
// var userId = null
// var sessionId = null

let sessionHash = null
let serverInstance = '' // figure out if this is the same for every tenant
let apiUrl = '' // make this optional for Intacct
let ctrlKey = false
let commands = {}
let searchBox
let listPosition = -1
let mouseClickLoginAsUserId
let loaded = false
const backupOpenInIFrame = openInIFrame

const openInIFrame = (url)=>{
	if(window.ctrlKey)
		openInNewWindow(url)
	else
		backupOpenInIFrame('iamain', url)
}
const getSessionID = ()=>{
	return window.location.search.match(/\.sess=(.*)&*/)[1]
}

var intacctNavigator = (()=>{
	function loadCommands(force) {
		if(serverInstance == null || orgId == null || sessionId == null) { init(); return false }
		commands['Refresh Metadata'] = {}
		commands['Merge Accounts'] = {}
		commands['Setup'] = {}
		commands['?'] = {}
		commands['Home'] = {}
		let options = {
			sessionHash: sessionHash,
			apiUrl: apiUrl
		}
		chrome.runtime.sendMessage(Object.assign(options, {
				action:'getSetupTree'
		}), response=>{
			Object.assign(commands, response)
		})
		chrome.runtime.sendMessage(Object.assign(options, {
			action:'getMetadata'
		}), response=>{
			Object.assign(commands, response)
		})
		chrome.runtime.sendMessage(Object.assign(options, {
			action:'getCustomObjects'
		}), response=>{
			Object.assign(commands, response)
		})
		hideLoadingIndicator()
	}
	function invokeCommand(cmd, newTab, event) {
		if(cmd == "") { return false }
		let checkCmd = cmd.toLowerCase()
		let targetUrl = ""
		switch(checkCmd) {
			case "refresh metadata":
				showLoadingIndicator()
				loadCommands(true)
				document.getElementById("nav_quickSearch").value = ""
				return true
				break
			// case "toggle lightning":
			// 	let mode
			// 	if(window.location.href.includes("lightning.force")) mode = "classic"
			// 	else mode = "lex-campaign"
			// 	targetUrl = serverInstance + "/ltng/switcher?destination=" + mode
			// 	break
			case "setup":
				targetUrl = serverInstance + "/setup"
				break
			case "home":
				targetUrl = serverInstance + "/"
				break
		}
		if(checkCmd.substring(0,9) == 'login as ') { loginAs(cmd, newTab); return true }
		else if(checkCmd.substring(0,14) == "merge accounts") { launchMergerAccounts(cmd.substring(14).trim()) }
		// else if(checkCmd.substring(0,11) == "merge cases") { launchMergerCases(cmd.substring(11).trim()) } //TODO more complicated merge call, will make later
		else if(checkCmd.substring(0,1) == "!") { createTask(cmd.substring(1).trim()) }
		else if(checkCmd.substring(0,1) == "?") { targetUrl = searchTerms(cmd.substring(1).trim()) }
		else if(typeof commands[cmd] != 'undefined' && commands[cmd].url) { targetUrl = commands[cmd].url }
		else if(debug && !checkCmd.includes("create a task: !") && !checkCmd.includes("global search usage")) {
			console.log(cmd + " not found in command list or incompatible")
			return false
		}
		if(targetUrl != "") {
			hideSearchBox()
			if(newTab)
				goToUrl(targetUrl, newTab)
			else
				goToUrl(targetUrl)
			return true
		} else { return false }
	}
	var goToUrl = (url, newTab)=>{ chrome.runtime.sendMessage({
			action: 'goToUrl',
			url: url,
			newTab: newTab
		}, function(response) {})
	}
	var searchTerms = (terms)=>{
		return serverInstance + "/search?str=" + encodeURI(terms)
	}
	var pasteFromClipboard = (newtab)=>{
		let cb = document.createElement("textarea")
		let body = document.getElementsByTagName('body')[0]
		body.appendChild(cb)
		cb.select()
		document.execCommand('paste')
		const clipboardValue = cb.value.trim()
		cb.remove()
		return clipboardValue
	}
	// var getIdFromUrl = ()=>{
	// 	const url = document.location.href
	// 	const ID_RE = [
	// 		/http[s]?\:\/\/.*force\.com\/.*([a-zA-Z0-9]{18})[^\w]*/, // tries to find the first 18 digit
	// 		/http[s]?\:\/\/.*force\.com\/.*([a-zA-Z0-9]{15})[^\w]*/ // falls back to 15 digit
	// 	]
	// 	for(var i in ID_RE) {
	// 		var match = url.match(ID_RE[i])
	// 		if (match != null) { return match[1] }
	// 	}
	// 	return false
	// }
	// var launchMerger = function(otherId, object) {
	// 	if(!otherId)
	// 		otherId = pasteFromClipboard()
	// 	if(![15,18].includes(otherId.length)) {
	// 		clearOutput()
	// 		addWord('[ERROR: you must have an Account ID in your clipboard or type one after the merge command]')
	// 		return
	// 	}
	// 	const thisId = getIdFromUrl()
	// 	if(thisId)
	// 		switch(object) {
	// 			case 'Account':
	// 				document.location.href = `${serverInstance}/merge/accmergewizard.jsp?goNext=+Next+&cid=${otherId}&cid=${thisId}`
	// 				break
	// 			case 'Case':
	// 				//TODO - needs to be a post request, so fetch or background will have to happen here
	// 				/*
	// 				const options = {
	// 					method: 'POST',
	// 					body: `{"message": {
	// 						"actions": [{
	// 							"id":"2319;a",
	// 							"descriptor":"serviceComponent://ui.merge.components.controller.MergeController/ACTION$loadMergeComparisonData",
	// 							"callingDescriptor":"UNKNOWN",
	// 							"params":{"recordIds":[otherId,thisId]}
	// 						}]
	// 					}}`
	// 				}
	// 					fetch(serverInstance+"/aura?r=23&ui-merge-components-controller.Merge.loadMergeComparisonData=1",options)
	// 				*/
	// 				break
	// 		}
	// }
	// var launchMergerAccounts = (otherId)=>launchMerger(otherId, 'Account')
	// var launchMergerCases = (otherId)=>launchMerger(otherId, 'Case')
	// var createTask = function(subject) {
	// 	showLoadingIndicator()
	// 	if(subject != "" && userId) {
	// 		chrome.runtime.sendMessage({
	// 				action:'createTask', apiUrl: apiUrl,
	// 				key: sessionHash, sessionId: sessionId,
	// 				domain: serverInstance, sessionHash: sessionHash,
	// 				subject: subject, userId: userId
	// 			}, response=>{
	// 			if(response.errors.length == 0) {
	// 				clearOutput()
	// 				commands["Go To Created Task"] = {url: serverInstance + "/"+ response.id }
	// 				document.getElementById("nav_quickSearch").value = ""
	// 				addWord('Go To Created Task')
	// 				addWord('(press escape to exit or enter a new command)')
	// 				let firstEl = document.querySelector('#nav_output :first-child')
	// 				if(listPosition == -1 && firstEl != null)
	// 					firstEl.className = "nav_child nav_selected"
	// 				hideLoadingIndicator()
	// 			}
	// 		})
	// 	}
	// }
	// function loginAs(cmd, newTab) {
	// 	let cmdSplit = cmd.split(' ')
	// 	let searchValue = cmdSplit[2]
	// 	if(cmdSplit[3] !== undefined)
	// 		searchValue += '+' + cmdSplit[3]
	// 	showLoadingIndicator()
	// 	chrome.runtime.sendMessage({
	// 		action:'searchLogins', apiUrl: apiUrl,
	// 		key: sessionHash, sessionId: sessionId,
	// 		domain: serverInstance, sessionHash: sessionHash,
	// 		searchValue: searchValue, userId: userId
	// 	}, success=>{
	// 		let numberOfUserRecords = success.records.length
	// 		hideLoadingIndicator()
	// 		if(numberOfUserRecords < 1) { addError([{"message":"No user for your search exists."}]) }
	// 		else if(numberOfUserRecords > 1) { loginAsShowOptions(success.records) }
	// 		else {
	// 			var userId = success.records[0].Id
	// 			loginAsPerform(userId, newTab)
	// 		}
	// 	})
	// }
	// function loginAsShowOptions(records) {
	// 	for(let i = 0; i < records.length; ++i) {
	// 		let cmd = 'Login As ' + records[i].Name
	// 		commands[cmd] = {key: cmd, id: records[i].Id}
	// 		addWord(cmd)
	// 	}
	// 	let firstEl = document.querySelector('#nav_output :first-child')
	// 	if(listPosition == -1 && firstEl != null) firstEl.className = "nav_child nav_selected"
	// }
	// function loginAsPerform(userId, newTab) {
	// 	let targetUrl = "https://" + apiUrl + "/servlet/servlet.su?oid=" + orgId + "&suorgadminid=" + userId + "&retURL=" + encodeURIComponent(window.location.pathname) + "&targetURL=" + encodeURIComponent(window.location.pathname) + "&"
	// 	hideSearchBox()
	// 	if(newTab) goToUrl(targetUrl, true)
	// 	else goToUrl(targetUrl)
	// 	return true
	// }

// ================================================================================================
// Interaction handling
	Mousetrap = (function(Mousetrap) {
		var _global_callbacks = {},
			_original_stop_callback = Mousetrap.stopCallback
		Mousetrap.stopCallback = function(e, element, combo) {
			if (_global_callbacks[combo]) { return false }
			return _original_stop_callback(e, element, combo)
		}
		Mousetrap.bindGlobal = function(keys, callback, action) {
			Mousetrap.bind(keys, callback, action)
			if (keys instanceof Array) {
				for (var i = 0; i < keys.length; i++) { _global_callbacks[keys[i]] = true }
				return
			}
			_global_callbacks[keys] = true
		}
		return Mousetrap
	})(Mousetrap)
	var mouseHandler = function() {
		this.classList.add('nav_selected')
		mouseClickLoginAsUserId = this.getAttribute("id")
		return true
	}
	var mouseClick = function() {
		document.getElementById("nav_quickSearch").value = this.firstChild.nodeValue
		listPosition = -1
		setVisibleSearch("hidden")
		if(!window.ctrlKey)
			invokeCommand(this.firstChild.nodeValue, false,'click')
		else
			hideSearchBox()
		return true
	}
	var mouseHandlerOut = function() { this.classList.remove('nav_selected'); return true }
	var mouseClickLoginAs = function() { loginAsPerform(mouseClickLoginAsUserId); return true }
	function bindShortcuts() {
		let searchBar = document.getElementById('nav_quickSearch')
		Mousetrap.bindGlobal('esc', function(e) { hideSearchBox() })
		Mousetrap.wrap(searchBar).bind('enter', kbdCommand)
		for (var i = 0; i < newTabKeys.length; i++) {
			Mousetrap.wrap(searchBar).bind(newTabKeys[i], kbdCommand)
		}
		Mousetrap.wrap(searchBar).bind('down', selectMove.bind(this, 'down'))
		Mousetrap.wrap(searchBar).bind('up', selectMove.bind(this, 'up'))
		Mousetrap.wrap(document.getElementById('nav_quickSearch')).bind('backspace', function(e) { listPosition = -1 })
		document.getElementById('nav_quickSearch').oninput = function(e) {
			lookAt()
			return true
		}
	}

// ===============================================================================================
// Interface
	function showLoadingIndicator() { document.getElementById('nav_loader').style.visibility = 'visible' }
	function hideLoadingIndicator() { document.getElementById('nav_loader').style.visibility = 'hidden' }
	var hideSearchBox = function() {
		let searchBar = document.getElementById('nav_quickSearch')
		searchBar.blur()
		clearOutput()
		searchBar.value = ''
		setVisibleSearch("hidden")
	}
	function setVisibleSearch(visibility) {
		let searchBox = document.getElementById("nav_searchBox")
		if(visibility == "hidden") {
			searchBox.style.opacity = 0
			searchBox.style.zIndex = -1
		}
		else {
			searchBox.style.opacity = 0.98
			searchBox.style.zIndex = 9999
			document.getElementById("nav_quickSearch").focus()
		}
	}
	function lookAt() {
		let newSearchVal = document.getElementById('nav_quickSearch').value
		if(newSearchVal !== '') addElements(newSearchVal)
		else {
			document.querySelector('#nav_output').innerHTML = ''
			listPosition = -1
		}
	}
	function addElements(input) {
		clearOutput()
		if(input.substring(0,1) == "?") addWord('Global Search Usage: ? <Search term(s)>')
		else if(input.substring(0,1) == "!") addWord('Create a Task: ! <Subject line>')
		else {
			let words = getWord(input, commands)
			if(words.length > 0)
			for (var i=0;i < words.length; ++i)
			addWord(words[i])
			else
			listPosition = -1
		}
		if ('login as'.includes(input.toLowerCase())) addWord('Usage: login as <FirstName> <LastName> OR <Username>')
		let firstEl = document.querySelector('#nav_output :first-child')
		if(listPosition == -1 && firstEl != null) firstEl.className = "nav_child nav_selected"
	}
	var getWord = function(input, dict) {
		if(typeof input === 'undefined' || input == '') return []
		let foundCommands = [],
			dictItems = [],
			terms = input.toLowerCase().split(" ")
		for (var key in dict) {
			if(dictItems.length > 10) break // stop at 10 since we can't see longer than that anyways - should make this a setting
			if(key.toLowerCase().indexOf(input) != -1) {
				dictItems.push({num: 10, key: key})
			} else {
				let match = 0
				for(var i = 0;i<terms.length;i++) {
					if(key.toLowerCase().indexOf(terms[i]) != -1) {
						match++
						sortValue = 1
					}
				}
				if (match == terms.length)
					dictItems.push({num : sortValue, key : key})
			}
		}
		dictItems.sort(function(a,b) { return b.num - a.num })
		for(var i = 0;i < dictItems.length;i++)
			foundCommands.push(dictItems[i].key)
		return foundCommands
	} 
	function addWord(word) {
		var d = document.createElement("div")
		var sp
		if(commands[word] != null && commands[word].url != null && commands[word].url != "") {
			sp = document.createElement("a")
			if(commands[word].url.startsWith('//'))
				commands[word].url = commands[word].url.replace('//','/')
			sp.setAttribute("href", commands[word].url)
		} else { sp = d }
		if(commands[word] != null && commands[word].id != null && commands[word].id != "") { sp.id = commands[word].id }
		sp.classList.add('nav_child')
		sp.appendChild(document.createTextNode(word))
		sp.onmouseover = mouseHandler
		sp.onmouseout = mouseHandlerOut
		sp.onclick = mouseClick
		if(sp.id && sp.length > 0) { sp.onclick = mouseClickLoginAs }
		searchBox.appendChild(sp)
	}
	function addError(text) {
		clearOutput()
		let err = document.createElement("div")
		err.className = "nav_child nav-error-wrapper"
		err.appendChild(document.createTextNode('Error! '))
		err.appendChild(document.createElement('br'))
		for(var i = 0;i<text.length;i++) {
			err.appendChild(document.createTextNode(text[i].message))
			err.appendChild(document.createElement('br'))
		}
		searchBox.appendChild(err)
	}
	function clearOutput() { if(typeof searchBox != 'undefined') searchBox.innerHTML = "" }
	function kbdCommand(e, key) {
		let position = listPosition
		let origText = '', newText = ''
		if(position < 0) position = 0
			origText = document.getElementById("nav_quickSearch").value
		if(typeof searchBox.childNodes[position] != 'undefined')
			newText = searchBox.childNodes[position].firstChild.nodeValue
		let newTab = newTabKeys.indexOf(key) >= 0 ? true : false
		if(!newTab)
			clearOutput()
		if(!invokeCommand(newText, newTab))
			invokeCommand(origText, newTab)
	}
	function selectMove(direction) {
		let searchBar = document.getElementById('nav_quickSearch')
		let firstChild
		let words = []
		for (var i = 0; i < searchBox.childNodes.length; i++)
			words.push(searchBox.childNodes[i].textContent)
		if(searchBox.childNodes[listPosition] != null)
			firstChild = searchBox.childNodes[listPosition].firstChild.nodeValue
		else
			firstChild = null
		let isLastPos = direction == 'down' ? listPosition < words.length-1 : listPosition >= 0
		if (words.length > 0 && isLastPos) {
			if(listPosition < 0) listPosition = 0
				listPosition = listPosition + (direction == 'down' ? 1 : -1)
			if(searchBox.childNodes[listPosition] != null)
				firstChild = searchBox.childNodes[listPosition].firstChild.nodeValue
			else
				firstChild = null
			if (listPosition >=0) {
				searchBox.childNodes[listPosition + (direction == 'down' ? -1 : 1) ].classList.remove('nav_selected')
				searchBox.childNodes[listPosition].classList.add('nav_selected')
				searchBox.childNodes[listPosition].scrollIntoViewIfNeeded()
				return false
			}
		}
	}
// ------------------------------------------------

// setup
	function init() {
		try {
			document.onkeyup = (ev)=>{ window.ctrlKey = ev.ctrlKey }
			document.onkeydown = (ev)=>{ window.ctrlKey = ev.ctrlKey }
			orgId = document.cookie.match(/sid=([\w\d]+)/)[1]
			serverInstance = getServerInstance()
			sessionHash = getSessionHash()
			if(sessionId == null) {
				chrome.runtime.sendMessage({ action: 'getApiSessionId', key: orgId }, response=>{
					if(response.error) console.log("response", orgId, response, chrome.runtime.lastError)
					else {
						sessionId = unescape(response.sessionId)
						userId = unescape(response.userId)
						apiUrl = unescape(response.apiUrl)
						var div = document.createElement('div')
						div.setAttribute('id', 'nav_searchBox')
						var loaderURL = chrome.extension.getURL("images/ajax-loader.gif")
						var logoURL = chrome.extension.getURL("images/sf-navigator128.png")
						div.innerHTML = `
<div class="nav_wrapper">
	<input type="text" id="nav_quickSearch" autocomplete="off"/>
	<img id="nav_loader" src= "${loaderURL}"/>
	<img id="nav_logo" src= "${logoURL}"/>
</div>
<div class="nav_shadow" id="nav_shadow"/>
<div class="nav_output" id="nav_output"/>
`
						document.body.appendChild(div)
						searchBox = document.getElementById("nav_output")
						hideLoadingIndicator()
						bindShortcuts()
						loadCommands()
					}
				})
			}
		} catch(e) { if(debug) console.log(e) }
	}
	init()
})()