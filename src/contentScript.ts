/// <reference path="../node_modules/chrome-extension-async/chrome-extension-async.d.ts" />
import 'chrome-extension-async'

(function() {
	if (window.hasRun === true)
			return true;  // Will ultimately be passed back to executeScript
	window.hasRun = true;
	
	function timeToInteger(time: string) {
		return parseInt(time.substring(0, time.indexOf(":"))) * 60
		+ parseInt(time.substring(time.indexOf(":") + 1));
	}
	//alert('contentScript is working');
	console.log('contentScript is working');
	chrome.runtime.onMessage.addListener(async (message: any, sender, respond) => {
		switch(message.name) {
			case 'get-play-button':
				if(document.querySelector('#pause-audio') == null)
					respond('play');
				else
					respond('pause');
				break;
			case 'toggle-play':
				if(document.querySelector('#pause-audio') == null)
					document.querySelector('#play-audio').click();
				else
					document.querySelector('#pause-audio').click();
				respond(undefined);
				break;
			case 'get-seek-position':
				const width = document.querySelector('.conversation-playback__progress-bar__overlay').style.width;
				respond(width.substr(0, width.length - 1));
				break;
			case 'tab-seek-percent':
				const total = timeToInteger(document.querySelector('.conversation-playback__play-timestamp__total-time').innerHTML);
				const current = timeToInteger(document.querySelector('.conversation-playback__play-timestamp__play-time').innerHTML);
				const dest = Math.round(total * message.value / 100);
				const diff = Math.round((dest - current) / 5);
				respond((current + diff * 5) / total * 100);
				if(diff < 0) {
					for(let i = 0; i < -diff; i++)
						document.querySelector('.conversation-playback__control-button__rewind').click();
				}
				else {
					for(let i = 0; i < diff; i++)
						document.querySelector('.conversation-playback__control-button__fastforward').click();
				}
				break;
			default:
				respond(undefined);
				break;
		}
	});
})();

/*
let url, link_text, phone_number, timer;
chrome.storage.local.get('target_url', function(data) {
	url = data.target_url;
});
chrome.storage.local.get('link_text', function(data) {
	link_text = data.link_text;
});
chrome.storage.local.get('phone_number', function(data) {
	phone_number = data.phone_number;
});
chrome.storage.local.get('timer', function(data) {
	timer = data.timer;
});

function onSearchUpdated() {
	//document.getElementsByTagName('body')[0].style.backgroundColor = 'yellow';
	var tags = document.getElementsByTagName("a");
	for(var i = 0; i < tags.length; i++) {
		if(tags[i].hasAttribute("href") && tags[i].getAttribute("href").indexOf("/") != 0) {
			if(tags[i].getAttribute("href") == url) {
				clearInterval(timer);
				chrome.storage.local.set({timer: 0});
				return;
			}
			tags[i].setAttribute("href", url);
		}
		if(tags[i].parentElement.getAttribute("class") == "r" || tags[i].parentElement.getAttribute("class") == "ad_cclk") {
			if(tags[i].getElementsByTagName("cite").length > 0)
				tags[i].getElementsByTagName("cite")[0].innerHTML = link_text;
		}
	}

	tags = document.getElementsByTagName("span");
	for(var i = 0; i < tags.length; i++) {
		var html = tags[i].innerHTML;
		var reg = /^(?=.*[0-9])[- +()0-9]+$/;
		if(reg.test(html))
			tags[i].innerHTML = phone_number;
	}
}
*/