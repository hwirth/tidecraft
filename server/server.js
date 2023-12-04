// server.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

// cd secrets
// C:\"Program Files"\Git\usr\bin\openssl.exe req -newkey rsa:2048 -nodes -keyout key.pem -x509 -days 365 -out cert.pem
// Domain: localhost

console.log('-'.repeat(80));
console.log('MESSAGE RELAY SERVER');

import * as fs    from 'fs';
import * as https from 'https';
import * as ws    from 'ws';
import { Enum } from './enum.js';

const SERVE_DOCUMENTS = !false;
const DOCUMENT_ROOT = '../client';   // No trailing slash!

const HTTP_OPTIONS = {
	port : 8888,
	cert : fs.readFileSync('../secrets/cert.pem'),
	key  : fs.readFileSync('../secrets/key.pem'),
};

const ERROR_HTML = (`
	<!DOCTYPE html><html lang="en">
	<head><meta charset="utf-8"><title>Error</title></head>
	<body><h1>Error</h1></body></html>
`).replace(/\n\t/g, '').trim();

const MIME_TYPES = {
	html   : 'text/html',
	css    : 'text/css',
	js     : 'application/javascript',
	txt    : 'text/plain',
	README : 'text/plain',
	png    : 'image/png',
	jpg    : 'image/jpeg',
	jpeg   : 'image/jpeg',
	webp   : 'image/webp',
	ico    : 'image/x-icon',
	woff   : 'font/woff',
	woff2  : 'font/woff2',
	wav    : 'audio/wav',
	mp3    : 'audio/mpeg',
	ogg    : 'audio/ogg',
};

const REQUESTS = Enum(
	'CHECK_NAME',
	'CHOOSE_NAME',
	'LIST_SESSIONS',
	'JOIN_SESSION',
	'LEAVE_SESSION',
);

const SIGNALS = Enum(
	'NAME_AVAILABLE',
	'NAME_ACCEPTED',
	'NAME_REJECTED',
);


// WEB SOCKET ////////////////////////////////////////////////////////////////////////////////////////////////////119:/

const clients = {};
const webSocketServer = new ws.WebSocketServer({ noServer: true });

webSocketServer.on('connection', (webSocket, request)=>{
	/*
	const queryParams = new URLSearchParams(request.url.slice(1));
	const id = queryParams.get('id');
	*/

	const clientAddress = request.socket.remoteAddress;
	const clientPort = request.socket.remotePort;
	const clientId = clientAddress + ':' + clientPort;

	console.log(clientAddress, clientPort, 'CONNECT', request.url);

	clients[clientId] = {
		webSocket,
		name    : null,
		session : null,
	};

	webSocket.isAlive = true;

	function nameValid(name) {
		const allowedChars = 'abcdefghijklmnopqrstuvwxyz1234567890 /.,:;_+-!?"*%&()[]{}=#~^';
		const validChar = (prev, char) => prev && (allowedChars.indexOf(char.toLowerCase()) >= 0);
		const allCharsValid = () => name.split('').reduce(validChar, true);
		return (name.length > 0) && allCharsValid();
	}

	function nameAvailable(name) {
		if (!nameValid(name)) return false;
		const hasName = client => client.name === name;
		const otherClients = client => client !== clients[clientId];
		const clientUsesName = Object.values(clients).filter(otherClients).find(hasName);
		return !clientUsesName;
	}

	function respond(message) {
		console.log('', message);
		webSocket.send(JSON.stringify(message));
	}

	function processRequest(message) {
		const client = clients[clientId];

		switch (message.request) {
			case REQUESTS.CHECK_NAME: {
				const signal = nameAvailable(message.name)
					? SIGNALS.NAME_AVAILABLE
					: SIGNALS.NAME_REJECTED;
				respond({ signal });
				break;
			}
			case REQUESTS.CHOOSE_NAME: {
				if (nameAvailable(message.name)) {
					client.name = message.name;
					respond({ signal: SIGNALS.NAME_ACCEPTED, name: message.name });
				} else {
					respond({ signal: SIGNALS.NAME_REJECTED });
				}
				break;
			}
			case REQUESTS.LIST_SESSIONS: {
				break;
			}
			case REQUESTS.JOIN_SESSION: {
				break;
			}
			case REQUESTS.LEAVE_SESSION: {
				break;
			}
		}
	}

	function relaySignal(message) {
		const stillConnected = client => client.webSocket.readyState === webSocket.OPEN;
		Object.values(clients).filter(stillConnected).forEach((client) => {
			const ws = client.webSocket;
			console.log(
				clientAddress, clientPort, '-->',
				ws._socket.remoteAddress,
				ws._socket.remotePort,
			);
			ws.send(message);
		});
	}

	webSocket.on('pong', () => {
		console.log(clientAddress, clientPort, 'PONG');
		webSocket.isAlive = true;
	});

	webSocket.on('message', (data, isBinary) => {
		const json = (isBinary) ? data : data.toString();
		const message = JSON.parse(json);
		console.log(clientAddress, clientPort, 'MESSAGE\n', message);

		if (message.request) {
			processRequest(message);
		} else {
			relaySignal(json);
		}
	});

	webSocket.on('close', () => {
		console.log(clientAddress, clientPort, 'CLOSE');
		delete clients[clientId];
	});
});

const pingInterval = setInterval(()=>{
	webSocketServer.clients.forEach((ws) => {
		console.log(ws._socket.remoteAddress, ws._socket.remotePort, 'PING');
		if (ws.isAlive === false) return ws.terminate();
		ws.isAlive = false;
		ws.ping();
	});
}, 30_000);

webSocketServer.on('close', ()=>{
	console.log('webSocketServer.onclose');
	clearInterval(pingInterval);
});


// HTTP SERVER ///////////////////////////////////////////////////////////////////////////////////////////////////119:/

function getMimeType(fileName) {
	const pos = fileName.lastIndexOf('.');
	const key = fileName.slice(pos + 1);
	if (!MIME_TYPES[key]) return null;
	return MIME_TYPES[key];
}

function filePath(fileName) {
	return DOCUMENT_ROOT + fileName;
}

function fileAvailable(fileName) {
	if (!fs.existsSync(fileName)) return false;
	const stats = fs.statSync(fileName);
	return stats.isFile;
}

function isValid(url) {
	const allowedChars = 'abcdefghijklmnopqrstuvwxyz1234567890/._-';
	const validChar = (prev, char) => prev && allowedChars.indexOf(char.toLowerCase()) >= 0;
	const allCharsValid = url.split('').reduce(validChar, true);
	const noDoubleDot   = url.indexOf('..') < 0;
	const leadingSlash  = url[0] === '/';
	return allCharsValid && leadingSlash && noDoubleDot;
}

const server = https.createServer(HTTP_OPTIONS, (request, response)=>{
	function log(...entries) {
		console.log(response.socket.remoteAddress, response.socket.remotePort, ...entries);
	}

	function sendContent(statusCode, content, mimeType) {
		response.writeHead(statusCode, { 'Content-Type': mimeType });
		response.end(content);
	}

	function sendError(...message) {
		log('ERROR:', ...message);
		sendContent(404, ERROR_HTML, 'text/html');
	}

	log(request.method, request.url);

	if (!SERVE_DOCUMENTS) return sendError('Configured to not serve documents');

	const queryPos = (request.url + '?').indexOf('?');
	const requestFile = request.url.slice(0, queryPos);
	const url = (requestFile === '/') ? '/index.html' : requestFile;

	if (request.method !== 'GET') return log('Bad HTTP method:' + request.method);
	if (!isValid(url)) return sendError('Bad URL', url);

	const fileName = filePath(url);
	if (!fileAvailable(fileName)) return sendError('Bad filename:', fileName);

	const mimeType = getMimeType(url);
	if (!mimeType) return sendError('Bad MIME type');

	try {
		const content = fs.readFileSync(fileName);
		sendContent(200, content, mimeType);
	}
	catch (error) {
		sendError('Can\'t read file:', fileName, error.toString());
	}
});

server.on('upgrade', (request, socket, head)=>{
	console.log(socket.remoteAddress, socket.remotePort, 'UPGRADE');
	webSocketServer.handleUpgrade(request, socket, head, (webSocket)=>{
		webSocketServer.emit('connection', webSocket, request);
	});
});

server.listen(HTTP_OPTIONS.port, ()=>{
	console.log('HTTP/WS listening on port', HTTP_OPTIONS.port);
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

console.log('-'.repeat(80));

//EOF