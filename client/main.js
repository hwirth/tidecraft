// main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import {
	PROGRAM_NAME, PROGRAM_VERSION,
	DEBUG, SETTINGS, OPTIONS,
	PLAYER_TYPES, SHIP_DEFINITION,
} from './configuration.js';

import { MessageBroker } from './message_broker.js';
import { UserInterface } from './user_interface.js';
import { Player } from './player.js';
import { Game } from './game.js';

export class Application {
	request;
	broadcast;

	constructor () {
		console.log( `%c${PROGRAM_NAME} v${PROGRAM_VERSION}`, 'color:green');
		setTimeout( this.init, SETTINGS.BODY_FADE_TIME );
	}

	init = async() => {
		// Create new session
		const messageBroker = await new MessageBroker(OPTIONS.REMOTE_OPPONENT);
		if (DEBUG.NETWORK) console.log('messageBroker.online:', messageBroker.online);

		// Determine online/local and client is player 1 or 2
		let player1type, player2type, isGameMaster;

		const player1Human   = OPTIONS.PLAYER1_HUMAN;
		const opponentRemote = OPTIONS.REMOTE_OPPONENT;
		const typeHuman      = PLAYER_TYPES.HUMAN;
		const typeComputer   = PLAYER_TYPES.COMPUTER;
		const typeRemote     = PLAYER_TYPES.REMOTE;

		if (opponentRemote && messageBroker.online) {
			player1type = player1Human ? typeHuman : typeRemote;
			player2type = player1Human ? typeRemote : typeHuman;
			isGameMaster = (player1type === typeHuman);
		} else {
			player1type = player1Human ? typeHuman : typeComputer;
			player2type = player1Human ? typeComputer : typeHuman;
			isGameMaster = true;
		}

		console.group('%cApplication.init', 'color:#080');
		console.log('Game type:', (OPTIONS.PLAYER2_REMOTE) ? 'Networked' : 'Local');
		console.log('This player:', (OPTIONS.PLAYER1_HUMAN) ? 'Player 1' : 'Player 2');
		console.log('Game Master:', isGameMaster);
		console.groupEnd();

		// Create app
		const shipDefinitions = SHIP_DEFINITION;

		this.player1 = new Player({
			messageBroker,
			shipDefinitions,
			type     : player1type,
			playerId : 1,
			name     : 'Alice',
			color    : '#0f8',
		});

		this.player2 = new Player({
			messageBroker,
			shipDefinitions,
			type     : player2type,
			playerId : 2,
			name     : 'Bob',
			color    : '#fc0',
		});

		if (isGameMaster) {
			this.game = new Game({
				messageBroker,
				player1 : this.player1,
				player2 : this.player2,
			});
		}

		this.ui = new UserInterface({
			messageBroker,
			shipDefinitions,
			playerId: player1Human ? this.player1.playerId : this.player2.playerId,
		});

	};
}

//EOF