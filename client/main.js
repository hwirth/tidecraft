// main.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { PROGRAM_NAME, PROGRAM_VERSION } from './configuration.js';
import { SETTINGS, OPTIONS, SIGNALS, PLAYER_TYPES, SHIP_DEFINITION } from './configuration.js';

import { MessageBroker } from './message_broker.js';
import { UserInterface } from './user_interface.js';
import { Player } from './player.js';
import { Game } from './game.js';

export class Application {

	constructor () {
		console.log( `%c${PROGRAM_NAME} v${PROGRAM_VERSION}`, 'color:green');
		setTimeout( this.init, SETTINGS.BODY_FADE_TIME );
	}

	init = () => {
		const messageBroker = new MessageBroker();

		this.broadcast = messageBroker.subscribe({
			sender: this, messageHandlers: {
				[SIGNALS.UI_READY] : this.onUiReady,
			},
		});

		const shipDefinitions = SHIP_DEFINITION;

		const player1 = new Player({
			messageBroker,
			shipDefinitions,
			type     : OPTIONS.PLAYER1_HUMAN ? PLAYER_TYPES.HUMAN : PLAYER_TYPES.COMPUTER,
			playerId : 1,
			name     : 'Alice',
			color    : '#0f8',
		});

		const player2 = new Player({
			messageBroker,
			shipDefinitions,
			type     : OPTIONS.PLAYER1_HUMAN ? PLAYER_TYPES.COMPUTER : PLAYER_TYPES.HUMAN,
			playerId : 2,
			name     : 'Bob',
			color    : '#fc0',
		});

		new Game({
			messageBroker,
			player1 : player1,
			player2 : player2,
		});

		new UserInterface({
			messageBroker,
			shipDefinitions,
			playerId : OPTIONS.PLAYER1_HUMAN ? player1.playerId : player2.playerId,
		});
	};

	onUiReady = () => {
		this.broadcast({ signal: SIGNALS.RESET_GAME });
	};

}

//EOF