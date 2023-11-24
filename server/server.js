// server.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

import WebSocket, { WebSocketServer } from 'ws';

const configuration = {
	wsURL  : null,
	wsPort : 8888,
};

console.log('-'.repeat(80));
console.log('MESSAGE RELAY SERVER starting...')

const clients = {};
const wss = new WebSocketServer({
	port: configuration.wsPort,
});

wss.on('connection', (ws, req)=>{
	/*
	const queryParams = new URLSearchParams(req.url.slice(1));
	const id = queryParams.get('id');
	*/

	const clientAddress = req.socket.remoteAddress;
	const clientPort = req.socket.remotePort;
	const clientId = clientAddress + ':' + clientPort;
	console.log(clientAddress, clientPort, 'connect', req.url);

	clients[clientId] = ws;
	ws.isAlive = true;

	ws.on('pong', () => {
		console.log(clientAddress, clientPort, 'pong');
		ws.isAlive = true;
	});

	ws.on('message', (data, isBinary) => {
		const message = (isBinary) ? data : data.toString();
		console.log(clientAddress, clientPort, 'message', message);

		Object.keys(clients).forEach((id) => {
			if (clients[id].readyState === WebSocket.OPEN) {
				clients[id].send(message);
			}
		});
	});

	ws.on('close', () => {
		console.log(clientAddress, clientPort, 'close');
		delete clients[clientId];
	});
});

const interval = setInterval(()=>{
	wss.clients.forEach((ws)=>{
		console.log(ws._socket.remoteAddress, ws._socket.remotePort, 'ping');
		if (ws.isAlive === false) return ws.terminate();
		ws.isAlive = false;
		ws.ping();
	});
}, 30000);

wss.on('close', ()=>{
	console.log('wss.onclose');
	clearInterval(interval);
});

console.log('WebSocket on port', configuration.wsPort);
console.log('-'.repeat(80));

//EOF