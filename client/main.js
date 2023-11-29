// main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import {
	PROGRAM_NAME, PROGRAM_VERSION,
	DEBUG, SETTINGS, OPTIONS,
	SIGNALS, PLAYER_TYPES, SHIP_DEFINITION,
} from './configuration.js';

import { MessageBroker } from './message_broker.js';
import { UserInterface } from './user_interface.js';
import { Player } from './player.js';
import { Game } from './game.js';

export class Application {

	constructor () {
		console.log( `%c${PROGRAM_NAME} v${PROGRAM_VERSION}`, 'color:green');
		setTimeout( this.init, SETTINGS.BODY_FADE_TIME );
	}

	init = async() => {
		const messageBroker = await new MessageBroker(OPTIONS.REMOTE_OPPONENT);
		if (DEBUG.NETWORK) console.log('messageBroker.online:', messageBroker.online);

		this.broadcast = messageBroker.subscribe({
			sender: this, messageHandlers: {
				[SIGNALS.UI_READY] : this.#onUiReady,
			},
		});

		let player1type, player2type, isGameMaster;
		if (OPTIONS.REMOTE_OPPONENT && messageBroker.online) {
			player1type = OPTIONS.PLAYER1_HUMAN ? PLAYER_TYPES.HUMAN : PLAYER_TYPES.REMOTE;
			player2type = OPTIONS.PLAYER1_HUMAN ? PLAYER_TYPES.REMOTE : PLAYER_TYPES.HUMAN;
			isGameMaster = (player1type === PLAYER_TYPES.HUMAN);
		} else {
			player1type = OPTIONS.PLAYER1_HUMAN ? PLAYER_TYPES.HUMAN : PLAYER_TYPES.COMPUTER;
			player2type = OPTIONS.PLAYER1_HUMAN ? PLAYER_TYPES.COMPUTER : PLAYER_TYPES.HUMAN;
			isGameMaster = true;
		}

		console.group('%cApplication.init', 'color:#080');
		console.log('Game type:', (OPTIONS.PLAYER2_REMOTE) ? 'Networked' : 'Local');
		console.log('This player:', (OPTIONS.PLAYER1_HUMAN) ? 'Player 1' : 'Player 2');
		console.log('Game Master:', isGameMaster);
		console.groupEnd();

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
			playerId : OPTIONS.PLAYER1_HUMAN ? this.player1.playerId : this.player2.playerId,
		});

	};

	#onUiReady = () => {
		this.broadcast({ signal: SIGNALS.RESET_GAME });
	};

}

//EOF