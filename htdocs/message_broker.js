// message_broker.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

export class MessageBroker {
	websocket;
	subscribers = [];

	constructor(wsURL) {
		// Create websocket, connect, assign receive function:
		this.websocket = { url: wsURL, onReceive: this.#onWsReceive };
	}

	subscribe = (onMessage, id = null) => {
		this.subscribers.push({
			id: id,
			send: onMessage,
		});
	};

	#onWsReceive = (message) => {
		const allRecipients   = () => true;
		const recipientWithId = recipient => recipient.id === message.id;
		const addressedRecipients = (message.id) ? recipientWithId : allRecipients;

		const sendMessage = recipient => recipient.onMessage(message);
		this.subscribers.filter(addressedRecipients).forEach(sendMessage);
	};

	#wsSend = (message) => {
		// Send to WS, future server will broadcast message to all clients
		// message --> server --all-clients--> back to us -->
		this.#onWsReceive(message);
	};

	send = (message) => {
		this.#wsSend(message);
	};

}

//EOF