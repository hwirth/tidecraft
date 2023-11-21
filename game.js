// game.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

import { DEBUG, SHIP_DEFINITION } from './configuration.js';

let instanceNr = 0;

export class Game {
	player1;
	player2;
	humanPlayer;
	computerPlayer;
	currentAttacker = null;
	phase;

	constructor({player1, player2}) {
		instanceNr += 1;
		if (DEBUG.INSTANCES) console.log(
			'%cGame init, instance nr.', 'color:magenta', instanceNr,
		);

		if (DEBUG.SHIP_DEFINITION) console.log( 'SHIP_DEFINITION', SHIP_DEFINITION );

		this.player1 = player1;
		this.player2 = player2;

		this.humanPlayer    = (player1.type === 'human') ? player1 : player2;
		this.computerPlayer = (player1.type !== 'human') ? player1 : player2;

		this.setGamePhase('deploy');
	}

	exit = () => {
		if (DEBUG.INSTANCES) console.log(
			'%cGame exit, instance nr.', 'color:#f00', instanceNr,
		);
	};

	setGamePhase = (newMode) => {
		this.phase = newMode;
	};

	dragShipAllowed = () => {
		return (this.phase === 'deploy' || this.phase == 'waitready');
	};

	placementValid = (player, coords, size, orientation) => {
		if ((orientation === 'horizontal') && (coords.x < 0 || coords.x > 10-size)) return false;
		if ((orientation === 'vertical') && (coords.y < 0 || coords.y > 10-size)) return false;

		const cellCoords = [];
		const deltaX = (orientation === 'horizontal') ? 1 : 0;
		const deltaY = (orientation === 'vertical') ? 1 : 0;
		for (let i = 0; i < size; ++i) {
			const x = coords.x + i*deltaX;
			const y = coords.y + i*deltaY;
			cellCoords.push({x, y});
		}

		const checkSet = new Set();
		cellCoords.forEach( ({x, y}) => {
			checkSet.add( JSON.stringify({x: x-1, y: y-1}) );
			checkSet.add( JSON.stringify({x: x-1, y: y+0}) );
			checkSet.add( JSON.stringify({x: x-1, y: y+1}) );

			checkSet.add( JSON.stringify({x: x+0, y: y-1}) );
			checkSet.add( JSON.stringify({x: x+0, y: y-0}) );
			checkSet.add( JSON.stringify({x: x+0, y: y+1}) );

			checkSet.add( JSON.stringify({x: x+1, y: y-1}) );
			checkSet.add( JSON.stringify({x: x+1, y: y+0}) );
			checkSet.add( JSON.stringify({x: x+1, y: y+1}) );
		});
		const checkCoords = Array.from(checkSet).map( string => JSON.parse(string) );

		const allFree = !checkCoords.reduce( (prev, {x, y}) => {
			if (x < 0 || x > 9 || y < 0 || y > 9) return prev;
			return prev || !!player.grid[y][x].ship;
		}, false);

		return allFree;
	};

	nextPlayer = () => {
		if (this.currentAttacker !== this.player1) {
			// When player was player2 or null (first move)
			this.currentAttacker = this.player1;
		} else {
			this.currentAttacker = this.player2;
		}

		if (DEBUG.GRIDS) {
			console.group('Next player: ' + this.currentAttacker.name);
			this.player1.debugGrid();
			this.player2.debugGrid();
			console.groupEnd();
		}
		else if (DEBUG.TURNS) {
			console.log('Next player: ' + this.currentAttacker.name);
		}

		if (this.currentAttacker.type === 'ai') this.currentAttacker.aiAttack();
	};

}

//EOF