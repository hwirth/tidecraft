// message_broker.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { DEBUG, SETTINGS } from './configuration.js';

let messageCount = DEBUG.STOP_AFTER_MESSAGES;

export class MessageBroker {
	webSocket   = null;
	online      = false;
	sessionId   = null;
	subscribers = [];

	constructor(networked = false) {
		return new Promise((done) => {
			const finalize = (event = null) => {
				if (event) {
					this.online = (event.type === 'open');
					this.webSocket.removeEventListener('error', finalize);
					this.webSocket.addEventListener('error', this.#onWsError);
				}
				done(this);
			};

			if (networked) {
				if (DEBUG.NETWORK) console.log('MessageBroker: Connecting to', SETTINGS.WEBSOCKET_URL);
				this.webSocket = new WebSocket(SETTINGS.WEBSOCKET_URL);
				this.webSocket.addEventListener('open', finalize);
				this.webSocket.addEventListener('error', finalize);
				this.webSocket.addEventListener('message', (event) => this.#onWsReceive(event.data));
			}
			else {
				finalize(null);
			}
		});
	}

	subscribe = ({ sender, messageHandlers, id = null }) => {
		//TODO const onMessage = (message) => messageHandlers[message.signal]({ sessionId: this.sessionId, ...message });
		const onMessage = (message) => {
			const handler = messageHandlers[message.signal];
			if (handler) {
				if (DEBUG.STOP_AFTER_MESSAGES !== null) {
					--messageCount;
					console.log(
						'%cMessage:', 'color:blue',
						DEBUG.STOP_AFTER_MESSAGES - messageCount,
						message, '-->', sender.constructor.name
					);
					if (messageCount < 0) return;
				}

				if (DEBUG.MESSAGES) console.log( message, '-->', sender.constructor.name + '.' + handler.name, 'id:', id );
				handler(message);
			}
		};

		/*TODO: Use
		const broadcast = (message) => {
			if ((this.id !== null) && (message.id === id)) {
				this.#onWsReceive(message);   // Receiver isn't remote
			} else {
				this.#wsSend(message);   // Receiver might be remote
			}
		};
		*/

		this.subscribers.push({ id, send: onMessage });
		return this.#wsSend;
	};

	#wsSend = (message) => {
		const json = JSON.stringify(message);

		if (this.online) {
			this.webSocket.send(json);
		} else {
			setTimeout(()=>this.#onWsReceive(json));
		}
	};

	#onWsReceive = (data, isBinary = false) => {
		const json = (isBinary) ? data : data.toString();
		const message = JSON.parse(json);

		const allRecipients   = () => true;
		const recipientWithId = subscriber => subscriber.id === message.id;
		const addressedRecipients = (message.id) ? recipientWithId : allRecipients;
		const sendMessage = subscriber => subscriber.send(message);
		this.subscribers.filter(addressedRecipients).forEach(sendMessage);
	};

	#onWsError = (error) => {
		throw error;
	};

}

//EOF