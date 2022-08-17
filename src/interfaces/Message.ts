type Message = {
  name: 'get-tab-volume',
  tabId: number
} | {
  name: 'set-tab-volume',
  tabId: number,
  value: number
} | {
  name: 'toggle-mute',
  tabId: number
} | {
  name: 'tab-seek-percent',
  tabId: number,
	value: number
}

export default Message
