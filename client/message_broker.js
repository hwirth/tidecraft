// message_broker.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

export class MessageBroker {
	websocket;
	subscribers = [];

	constructor(wsURL) {
		// Create pretend websocket
		this.websocket = { url: wsURL, onReceive: this.#onWsReceive };
	}

	subscribe = (onMessage, id = null) => {
		this.subscribers.push({ id: id, send: onMessage });
	};

	send = (message) => {
		const json = JSON.stringify(message);
		this.#wsSend(json);
	};

	#onWsReceive = (json) => {
		const message = JSON.parse(json);
		const allRecipients   = () => true;
		const recipientWithId = recipient => recipient.id === message.id;
		const addressedRecipients = (message.id) ? recipientWithId : allRecipients;
		const sendMessage = recipient => recipient.onMessage(message);
		this.subscribers.filter(addressedRecipients).forEach(sendMessage);
	};

	#wsSend = (message) => {
		// Pretend to send to WS
		// Future server will broadcast message back to all connected clients
		this.#onWsReceive(message);
	};

}

//EOF