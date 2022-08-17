/// <reference path="../node_modules/chrome-extension-async/chrome-extension-async.d.ts" />
import 'chrome-extension-async'

import Message from './interfaces/Message'

// Add a `manifest` property to the `chrome` object.
/*const manifest = chrome.runtime.getManifest();

var injectIntoTab = function (tab) {
	// You could iterate through the content scripts here
	var scripts = manifest.content_scripts[0].js;
	var i = 0, s = scripts.length;
	for (; i < s; i++) {
		chrome.tabs.executeScript(tab.id, {
			file: scripts[i]
		});
	}
}

// Get all windows
chrome.windows.getAll({
	populate: true
}, function (windows) {
	var i = 0, w = windows.length, currentWindow;
	for (; i < w; i++) {
		currentWindow = windows[i];
		var j = 0, t = currentWindow.tabs.length, currentTab;
		for (; j < t; j++) {
			currentTab = currentWindow.tabs[j];
			// Skip chrome:// and https:// pages
			if (!currentTab.url.match(/(chrome|https):\/\//gi)) {
				injectIntoTab(currentTab);
			}
		}
	}
});*/

//	Wait for 1 second and inject contentScript to all tabs
setTimeout(() => {
	chrome.tabs.query({'url': "https://otter.ai/*"}, tabs => {
		tabs.forEach(tab => {
			console.log(tab.id, tab.title);
			//	Inject contentScript for existing tabs
			//	For Manifest V3
			//chrome.scripting.executeScript({target: {tabId: tab.id, allFrames: true}, 
			//	files: ['contentScript.js'],
			//});
			chrome.tabs.executeScript(tab.id, { 
				file: 'contentScript.js'
			}, function(results) {
				if (chrome.runtime.lastError || !results || !results.length) {
						return;  // Permission error, tab closed, etc.
				}
				if (results[0] !== true) {
						// Not already inserted before, do your thing, e.g. add your CSS:
						//chrome.tabs.insertCSS(tabId, { file: 'yourstylesheet.css' });
				}
			});
		});
	})
}, 1000)

chrome.runtime.onInstalled.addListener(function (details) {
	if (details.reason == "install") {
	//	alert('Please reload all Otter web pages.')
	}
});

chrome.runtime.onStartup.addListener(function () {
	console.log('startup');
})

// Handle messages from popup
chrome.runtime.onMessage.addListener(async (message: Message, sender, respond) => {
	switch (message.name) {
		case 'get-tab-volume':
			respond(getTabVolume(message.tabId));
			break
		case 'set-tab-volume':
			respond(undefined) // Nothing to send here.
			await setTabVolume(message.tabId, message.value)
			break;
		case 'toggle-mute':
			if (getTabVolume(message.tabId) > 0)
				respond(0);
			else {
				if (tabs[message.tabId] && tabs[message.tabId].lastVolume > 0)
					respond(tabs[message.tabId].lastVolume);
				else
					respond(1);
			}
			await toggleMute(message.tabId);
			break;
		default:
			throw Error(`Unknown message received: ${JSON.stringify(message)}`)
	}
})

// Clean everything up once the tab is closed
chrome.tabs.onRemoved.addListener(disposeTab)

interface CapturedTab {
	audioContext: AudioContext,
	// While we will never use `streamSource` property in the code,
	// it is necessary to keep a reference to it, or else
	// it will get garbage-collected and the sound will be gone.
	streamSource: MediaStreamAudioSourceNode,
	gainNode: GainNode,
	lastVolume: number
}

// We use promises to fight race conditions.
const tabs: { [tabId: number]: CapturedTab } = {}

/**
 * Captures a tab's sound, allowing it to be programmatically modified.
 * Puts a promise into the `tabs` object. We only need to call this function
 * if the tab isn't yet in that object.
 * @param tabId Tab ID
 */
function captureTab(tabId: number, callback: any) {
	try {
		chrome.tabs.query({}).then(alltabs => {
			const tab = alltabs.find(tab => tab.id == tabId);
			chrome.tabs.highlight({tabs: [tab.index], windowId: tab.windowId}).then(() => {
				chrome.tabs.query({active: true, currentWindow: true}).then(activeTabs => {
					if(activeTabs[0].id == tabId) {
						//	This doesn't work with Manifest V3
						//https://stackoverflow.com/questions/70329476/chrome-tabcapture-is-undefined-when-extension-icon-is-clicked
						chrome.tabCapture.capture({ audio: true, video: false }).then(stream => {
							const audioContext = new AudioContext()
							const streamSource = audioContext.createMediaStreamSource(stream)
							const gainNode = audioContext.createGain()
			
							streamSource.connect(gainNode)
							gainNode.connect(audioContext.destination)
			
							tabs[tabId] = { audioContext, streamSource, gainNode, lastVolume: 1 };
			
							callback();
						});
					}
					else {
						alert('Please activate the tab manually and click again.')
					}
				});
		})
		});
	} catch (ex) {
		alert(JSON.stringify(ex));
	}
}

async function toggleMute(tabId: number) {
	if (getTabVolume(tabId) == 0)
		await setTabVolume(tabId, tabs[tabId].lastVolume);
	else {
		setTabVolume(tabId, 0);
	}
}

/**
 * Returns a tab's volume, `1` if the tab isn't captured yet.
 * @param tabId Tab ID
 */
function getTabVolume(tabId: number) {
	return tabId in tabs ? tabs[tabId].gainNode.gain.value : 1
}

/**
 * Sets a tab's volume. Captures the tab if it wasn't captured.
 * @param tabId Tab ID
 * @param value Volume. `1` means 100%, `0.5` is 50%, etc
 */
async function setTabVolume(tabId: number, value: number) {
	if(value < 0)	value = 0;
	if(value > 1)	value = 1;
	if (!(tabId in tabs)) {
		captureTab(tabId, function () {
			tabs[tabId].gainNode.gain.value = value
			updateBadge(tabId, value);

			if (value > 0)
				tabs[tabId].lastVolume = value;

			console.log('setTabVolume', tabId, value, tabs);
		})
	}
	else {
		tabs[tabId].gainNode.gain.value = value
		updateBadge(tabId, value);

		if (value > 0)
			tabs[tabId].lastVolume = value;

		console.log('setTabVolume', tabId, value, tabs);
	}
}

/**
 * Updates the badge which represents current volume.
 * @param tabId Tab ID
 * @param value Volume. `1` will display 100, `0.5` - 50, etc
 */
async function updateBadge(tabId: number, value: number) {
	if (tabId in tabs) {
		const text = String(Math.round(value * 100)) // I love rounding errors!
		chrome.browserAction.setBadgeText({ text, tabId })
	}
}

/**
 * Removes the tab from `tabs` object and closes its AudioContext.
 * This function gets called when a tab is closed.
 * @param tabId Tab ID
 */
async function disposeTab(tabId: number) {
	if (tabId in tabs) {
		(await tabs[tabId]).audioContext.close()
		delete tabs[tabId]
	}
}
