// @copyright 2012+ Daniel Nakov / Silverline CRM
// http://silverlinecrm.com
// @copyright 2019+ Danny Summerlin
let sessionId = null
let serverInstance = '' // figure out if this is the same for every tenant
let apiUrl = '' // make this optional for Intacct
let ctrlKey = false
let commands = {}
let searchBox
let listPosition = -1
let mouseClickLoginAsUserId
let loaded = false

var intacctNavigator = (()=>{
	const loadCommands = (force)=>{
		if(serverInstance == null || sessionId == null) { init(); return false }
		commands['Refresh Metadata'] = {}
		commands['Merge Accounts'] = {}
		commands['Setup'] = {}
		commands['?'] = {}
		commands['Home'] = {}
		let options = {
			sessionId: sessionId,
			apiUrl: apiUrl
		}
		let menu = []
		try {
			[...document.getElementsByClassName('qx-siamenu-main')[0].getElementsByTagName('a')].forEach(a=>{
				if(a.text.trim() != '') {
					menu.push({label: a.text.trim(), link: a.href})
				}
			})
			Object.assign(commands, menu)
		} catch(e) {
			console.log(e)
		}
		// Likely won't need this because we'll use on page parsing instead
		// chrome.runtime.sendMessage(Object.assign(options, {
		// 	action:'getCustomObjects'
		// }), response=>{
		// 	Object.assign(commands, response)
		// })
		hideLoadingIndicator()
	}
	const invokeCommand = (cmd, newTab, event)=>{
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
			case "setup":
				targetUrl = serverInstance + "/setup"
				break
			case "home":
				targetUrl = serverInstance + "/"
				break
		}
		// else if(checkCmd.substring(0,1) == "!") { createTask(cmd.substring(1).trim()) }
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
	const searchTerms = (terms)=>{
		return serverInstance + "/search?str=" + encodeURI(terms)
	}
	const pasteFromClipboard = (newtab)=>{
		let cb = document.createElement("textarea")
		let body = document.getElementsByTagName('body')[0]
		body.appendChild(cb)
		cb.select()
		document.execCommand('paste')
		const clipboardValue = cb.value.trim()
		cb.remove()
		return clipboardValue
	}
	const goToUrl = (url, newTab)=>{ 
		if(newTab)
			chrome.runtime.sendMessage({
				action: 'goToUrl',
				url: url,
				newTab: newTab
			}, (response)=>{})
		else
			document.getElementById('iamain').setLocation(url)
	}

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
	const mouseHandler = function() {
		this.classList.add('nav_selected')
		mouseClickLoginAsUserId = this.getAttribute("id")
		return true
	}
	const mouseClick = function() {
		document.getElementById("nav_quickSearch").value = this.firstChild.nodeValue
		listPosition = -1
		setVisibleSearch("hidden")
		if(!window.ctrlKey)
			invokeCommand(this.firstChild.nodeValue, false,'click')
		else
			hideSearchBox()
		return true
	}
	const mouseHandlerOut = function() { this.classList.remove('nav_selected'); return true }
	function bindShortcuts() {
		let searchBar = document.getElementById('nav_quickSearch')
		Mousetrap.bindGlobal('esc', (e)=>{ hideSearchBox() })
		Mousetrap.wrap(searchBar).bind('enter', kbdCommand)
		for (var i = newTabKeys.length; i >= 0; i--) {
			Mousetrap.wrap(searchBar).bind(newTabKeys[i], kbdCommand)
		}
		Mousetrap.wrap(searchBar).bind('down', selectMove.bind(this, 'down'))
		Mousetrap.wrap(searchBar).bind('up', selectMove.bind(this, 'up'))
		Mousetrap.wrap(document.getElementById('nav_quickSearch')).bind('backspace', function(e) { listPosition = -1 })
		document.getElementById('nav_quickSearch').oninput = (e)=>{
			lookAt()
			return true
		}
	}

// ===============================================================================================
// Interface
	const showLoadingIndicator = ()=>{ document.getElementById('nav_loader').style.visibility = 'visible' }
	const hideLoadingIndicator = ()=>{ document.getElementById('nav_loader').style.visibility = 'hidden' }
	const hideSearchBox = ()=>{
		let searchBar = document.getElementById('nav_quickSearch')
		searchBar.blur()
		clearOutput()
		searchBar.value = ''
		setVisibleSearch("hidden")
	}
	const setVisibleSearch = (visibility)=>{
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
	const lookAt = ()=>{
		let newSearchVal = document.getElementById('nav_quickSearch').value
		if(newSearchVal !== '') addElements(newSearchVal)
		else {
			document.querySelector('#nav_output').innerHTML = ''
			listPosition = -1
		}
	}
	const addElements = (input)=>{
		clearOutput()
		if(input.substring(0,1) == "?") addWord('Global Search Usage: ? <Search term(s)>')
		// else if(input.substring(0,1) == "!") addWord('Create a Task: ! <Subject line>')
		else {
			let words = getWord(input, commands)
			if(words.length > 0)
			for (var i=0;i < words.length; ++i)
			addWord(words[i])
			else
			listPosition = -1
		}
		let firstEl = document.querySelector('#nav_output :first-child')
		if(listPosition == -1 && firstEl != null) firstEl.className = "nav_child nav_selected"
	}
	const getWord = (input, dict)=>{
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
	const addWord = (word)=>{
		let d = document.createElement("div")
		let sp
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
	const addError = (text)=>{
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
	const clearOutput = ()=>{ if(typeof searchBox != 'undefined') searchBox.innerHTML = "" }
	const kbdCommand = (e, key)=>{
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
// Intacct Specific
	const toggleExpandAll = ()=>{
		// TODO find expansion toggle classname
		// also maybe this should be a toggle that happens automatically on page load?
		// Or adds a button to the page so it is more obvious?
		document.getElementsByClassName('expand').click()
	}
	const fixFieldNames = (field)=>{
		// doing this so it can either be called manually or autotriggered, we'll see which is actually useful
		let fields = []
		if(field)
			fields.push(field)
		else // TODO find API Name field classname
			fields = [...document.getElementsByClassName('api_name')]
		fields.forEach(f=>{
			f.value = f.value.replace(/[^\w\d]/g, '_')
		})
	}

// setup
	init = ()=>{
		try {
			document.onkeyup = ev => window.ctrlKey = ev.ctrlKey
			document.onkeydown = ev => window.ctrlKey = ev.ctrlKey
			document.getElementsByClassName('api_name').onchange = ev => fixFieldNames(ev.target)
			// if ( getSetting('autoExpandAll') )
				// expandAll()
			// serverInstance = getServerInstance()
			sessionId = getSessionId()
			// userId = unescape(response.userId)
			// apiUrl = unescape(response.apiUrl)
			let div = document.createElement('div')
			div.setAttribute('id', 'nav_searchBox')
			const loaderURL = chrome.extension.getURL("images/ajax-loader.gif")
			const logoURL = chrome.extension.getURL("images/navigator128.png")
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
		} catch(e) { if(debug) console.log(e) }
	}
	init()
})()