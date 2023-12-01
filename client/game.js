// game.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { DEBUG, SIGNALS } from './configuration.js';

export class Game {
	broadcast;
	isGameMaster;
	player1;
	player2;
	nrReadyPlayers;
	currentPlayer;

	constructor({ messageBroker, player1, player2 }) {
		this.broadcast = messageBroker.subscribe({
			sender : this,   // For debugging only
			id     : null,   // Listen for messages with and without id
			messageHandlers: {
				[SIGNALS.RESET_GAME]     :  this.onResetGame,
				[SIGNALS.PLAYER_READY]   :  this.onPlayerReady,
				[SIGNALS.PERFORM_ATTACK] :  this.onPerformAttack,
				[SIGNALS.STILL_ALIVE]    :  this.onStillAlive,
				[SIGNALS.I_AM_DEAD]      :  this.onIAmDead,
			},
		});
		this.player1      = player1;
		this.player2      = player2;
	}

	/*eslint-disable-next-line indent*/
// MESSAGE HANDLERS //////////////////////////////////////////////////////////////////////////////////////////////119:/

	onResetGame = () => {
		this.nrReadyPlayers = 0;
		this.currentPlayer = null;
		this.broadcast({ signal: SIGNALS.CURRENT_PLAYER, currentPlayerId: null });
		if (DEBUG.TURNS) this.logTurns();
	};

	onPlayerReady = () => {
		this.nrReadyPlayers += 1;

		if (DEBUG.MESSAGES) console.log('Game.onPlayerReady: nrReadyPlayers:', this.nrReadyPlayers);

		if (this.nrReadyPlayers === 2) {
			if (DEBUG.GRIDS) {
				this.player1.debugGrid();
				this.player2.debugGrid();
			}

			this.currentPlayer = this.player1;
			if (DEBUG.TURNS) this.logTurns();

			this.broadcast({ signal: SIGNALS.CURRENT_PLAYER, currentPlayerId: this.currentPlayer.playerId });
			this.broadcast({ signal: SIGNALS.SELECT_TARGET, id: this.player1.playerId });
		}
	};

	onPerformAttack = (message) => {
		const receiver = (message.attacker === this.player1.playerId) ? this.player2 : this.player1;
		this.broadcast({ signal: SIGNALS.RECEIVE_ATTACK, id: receiver.playerId, coords: message.coords });
	};

	onStillAlive = () => {
		const nextPlayer = (this.currentPlayer === this.player1) ? this.player2 : this.player1;
		this.currentPlayer = nextPlayer;
		this.broadcast({ signal: SIGNALS.CURRENT_PLAYER, currentPlayerId: this.currentPlayer.playerId });
		this.broadcast({ signal: SIGNALS.SELECT_TARGET, id: nextPlayer.playerId });
		if (DEBUG.TURNS) this.logTurns();
	};

	onIAmDead = () => {
		this.broadcast({ signal: SIGNALS.CURRENT_PLAYER, currentPlayerId: null });
		const loser  = (this.currentPlayer === this.player1) ? this.player2 : this.player1;
		const winner = (this.currentPlayer === this.player1) ? this.player1 : this.player2;
		this.broadcast({ signal: SIGNALS.DISPLAY_VICTORY, id: winner.playerId });
		this.broadcast({ signal: SIGNALS.DISPLAY_DEFEAT, id: loser.playerId });
		if (DEBUG.TURNS) this.logTurns();
	};

	logTurns = () => {
		const id    = (this.currentPlayer === null) ? 'none' : this.currentPlayer.playerId;
		const name  = (this.currentPlayer === null) ? '' : this.currentPlayer.name;
		const color = (this.currentPlayer === null) ? 'unset' : this.currentPlayer.color;
		console.log('%cCurrent player: %c' + name, 'color:#08f', 'color:' + color, id);
	};
}

//EOF