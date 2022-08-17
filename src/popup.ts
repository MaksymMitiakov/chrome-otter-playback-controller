/// <reference path="../node_modules/chrome-extension-async/chrome-extension-async.d.ts" />
import 'chrome-extension-async'

import Message from './interfaces/Message'
//import { MDCSlider } from '@material/slider'

//const sliderElem: HTMLDivElement = document.querySelector('#volume-slider')
//const slider = new MDCSlider(sliderElem)

void (async () => {
  // Hide the slider until we know the initial volume
  //sliderElem.style.opacity = '0'

  //const initialValue = await getActiveTabVolume()
  //slider.value = initialValue * 100

  //sliderElem.style.opacity = '1'

	const tabs = await chrome.tabs.query({'url':"https://otter.ai/*"});
	tabs.forEach(tab => {
		const div = document.createElement("DIV");
		div.classList.add("tab");
		div.setAttribute("tab-id", tab.id.toString());
		div.innerHTML = 
				`<span class="title">${tab.title}</span>
				<div class="buttons">
					<button class="play-pause"></button>
		
					<div class="unmuted toggle-sound" href="#">
						<div class="tooltip--left sound" data-tooltip="Turn On/Off Sound">
							<div class="sound--icon fa fa-volume-off"></div>
							<div class="sound--wave sound--wave_one"></div>
							<div class="sound--wave sound--wave_two"></div>
						</div>
					</div>
		
					<div class="volume-up" href="#">
						<div class="sound" data-tooltip="Volume Up">
							<div class="sound--icon fa fa-volume-off"></div>
							<div class="sound-up">+</div>
						</div>
					</div>
		
					<div class="volume-down" href="#">
						<div class="sound" data-tooltip="Volume Down">
							<div class="sound--icon fa fa-volume-off"></div>
							<div class="sound-down">-</div>
						</div>
					</div>
				</div>
				<div class="slidecontainer">
					<input type="range" min="1" max="100" value="50" class="slider" id="volume-slider">
				</div>`;
		document.body.appendChild(div);
	});

	const divs = document.querySelectorAll("div.tab");
	for(let i = 0; i < divs.length; i++) {
		const div = divs[i];
	
		const tabId = parseInt(div.getAttribute('tab-id'));
		
		div.querySelector(".play-pause").addEventListener('click', function() {
			const btn = this;
			chrome.tabs.sendMessage(tabId, {name: 'toggle-play'}, function(res) {
				btn.classList.toggle('paused');
			});
		});
		
		div.querySelector('.volume-up').addEventListener('click', function() {
			getTabVolume(tabId).then(initialValue => {
				console.log(initialValue);
				setTabVolume(tabId, initialValue + 0.1);
			});
		});

		div.querySelector('.volume-down').addEventListener('click', function() {
			getTabVolume(tabId).then(initialValue => {
				console.log(initialValue);
				setTabVolume(tabId, initialValue - 0.1);
			});
		});

		div.querySelector('.toggle-sound').addEventListener('click', function() {
			toggleMute(tabId).then(value => {
				console.log(tabId, this);
				if(value == 0) {
					this.classList.remove('unmuted');
					this.classList.add('sound-mute');
				}
				else {
					this.classList.add('unmuted');
					this.classList.remove('sound-mute');
				}
			});
		});

		div.querySelector("#volume-slider").onchange = function(evt) {
			return chrome.tabs.sendMessage(tabId, {name: 'tab-seek-percent', value: evt.currentTarget.value}, function(res) {
			});
		}
		
		var readState = function() {
			try {
				//	Check site state
				chrome.tabs.sendMessage(tabId, {name: 'get-play-button'}, function(res) {
					if(res != 'play') {
						div.querySelector(".play-pause").classList.add('paused');
					}
					else {
						div.querySelector(".play-pause").classList.remove('paused');
					}
				});

				chrome.tabs.sendMessage(tabId, {name: 'get-seek-position'}, function(res) {
					div.querySelector("#volume-slider")['value'] = parseInt(res);
				});

				getTabVolume(tabId).then(value => {
					console.log(tabId, div.getAttribute('tab-id'), value);
					const btn = div.querySelector('.toggle-sound');
					if(value == 0) {
						btn.classList.remove('unmuted');
						btn.classList.add('sound-mute');
					}
					else {
						btn.classList.add('unmuted');
						btn.classList.remove('sound-mute');
					}
				})
			}
			catch(ex) {
				console.log(ex);
			}
		}
		setInterval(readState, 1000);
		readState();
	}
})()

function getTabVolume (tabId: number) {
  const message: Message = { name: 'get-tab-volume', tabId };
  return chrome.runtime.sendMessage(message)
}

function setTabVolume (tabId: number, value: number) {
  const message: Message = { name: 'set-tab-volume', tabId, value }
  return chrome.runtime.sendMessage(message);
}

function toggleMute (tabId: number) {
  const message: Message = { name: 'toggle-mute', tabId }
  return chrome.runtime.sendMessage(message);
}
