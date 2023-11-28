// message_broker.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { DEBUG } from './configuration.js';

let messageCount = DEBUG.STOP_AFTER_MESSAGES;

export class MessageBroker {
	websocket;
	subscribers = [];

	constructor(wsURL) {
		// Create pretend websocket
		this.websocket = { url: wsURL };
	}

	subscribe = ({ sender, messageHandlers, id = null }) => {
		//TODO const onMessage = (message) => messageHandlers[message.signal](message);
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

				if (DEBUG.MESSAGES) console.log( '>', sender.constructor.name, id, message, handler );
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

	/*eslint-disable indent*/
	#wsSend = (message) => {
setTimeout(()=>{
		/*TODO
		// Pretend to send to WS
		// Future server will broadcast message back to all connected clients
		const json = JSON.stringify(message);
		websocket.send(json);
	};
	#onWsReceive = (json) => {
		const message = JSON.parse(json);
		*/
		const allRecipients   = () => true;
		const recipientWithId = subscriber => subscriber.id === message.id;
		const addressedRecipients = (message.id) ? recipientWithId : allRecipients;
		const sendMessage = subscriber => subscriber.send(message);
		this.subscribers.filter(addressedRecipients).forEach(sendMessage);
});
	};
	/*eslint-enable indent*/

}

//EOF