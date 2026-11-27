const CHANNEL_NAME = 'habit-tracker-data';
const listeners = new Set();
let channel;

function getChannel() {
	if (typeof BroadcastChannel === 'undefined') return null;
	if (!channel) {
		channel = new BroadcastChannel(CHANNEL_NAME);
		channel.addEventListener('message', (event) => {
			if (event.data?.type !== 'changed') return;
			listeners.forEach((listener) => listener());
		});
	}
	return channel;
}

export function notifyDataChanged() {
	getChannel()?.postMessage({ type: 'changed' });
}

export function subscribeToDataChanges(listener) {
	getChannel();
	listeners.add(listener);
	return () => listeners.delete(listener);
}
