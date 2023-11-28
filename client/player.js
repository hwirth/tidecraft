// player.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { DEBUG, SETTINGS, OPTIONS } from './configuration.js';
import { SIGNALS, PLAYER_TYPES, ATTACK_RESULTS } from './configuration.js';
import { Ship } from './ship.js';

export class Player {
	broadcast;
	shipDefinitions;

	type;
	playerId;
	name;
	color;
	ships;
	grid;
	notYetAttacked;

	constructor({ messageBroker, shipDefinitions, type, playerId, name, color }) {
		this.shipDefinitions = shipDefinitions;
		this.type            = type;
		this.playerId        = playerId;
		this.name            = name;
		this.color           = color;

		this.broadcast = messageBroker.subscribe({
			sender: this, id: playerId, messageHandlers: {
				[SIGNALS.RESET_GAME]      : this.onResetGame,
				[SIGNALS.READY_TO_DEPLOY] : this.onReadyToDeploy,
				[SIGNALS.DEPLOY_SHIP]     : this.onDeployShip,
				[SIGNALS.PLACE_SHIP]      : this.onPlaceShip,
				[SIGNALS.ACCEPT_DEPLOY]   : this.onAcceptRejectDeploy,
				[SIGNALS.REJECT_DEPLOY]   : this.onAcceptRejectDeploy,
				[SIGNALS.DEPLOY_DONE]     : this.onDeployDone,
				[SIGNALS.RESET_YARD]      : this.onResetYard,
				[SIGNALS.WAIT_READY]      : this.onWaitReady,
				[SIGNALS.SELECT_TARGET]   : this.onSelectTarget,
				[SIGNALS.TARGET_CHOSEN]   : this.onTargetChosen,
				[SIGNALS.RECEIVE_ATTACK]  : this.onReceiveAttack,
			},
		});
	}


	//////////////////////
	// MESSAGE HANDLERS //
	//////////////////////

	onResetGame = () => {
		this.createShips();
		this.clearNotYetAttacked();
		this.moveShipsToYard();

		const signal = {
			[PLAYER_TYPES.HUMAN]   : SIGNALS.RESET_BOARD,
			[PLAYER_TYPES.COMPUTER]: SIGNALS.DEPLOY_SHIP,
		}[this.type];

		this.broadcast({ signal, id: this.playerId });
	};

	onReadyToDeploy = () => {
		this.broadcast({ signal: SIGNALS.DEPLOY_SHIP, id: this.playerId });
	};

	onDeployShip = () => {
		switch (this.type) {
			case PLAYER_TYPES.HUMAN: {
				this.broadcast({ signal: SIGNALS.START_PLACING, id: this.playerId });
				break;
			}
			case PLAYER_TYPES.COMPUTER: {
				const { shipId, placement } = this.aiDeployShip();
				this.broadcast({
					signal: SIGNALS.PLACE_SHIP,
					id    : this.playerId,
					shipId,
					placement,
				});
				break;
			}
		}
	};

	onPlaceShip = (message) => {
		if (DEBUG.PLACE_SHIPS) console.log('Player.onPlaceShip:', message.shipId, message.placement);

		const ship = this.ships.find(ship => ship.shipId === message.shipId);
		const removedPlacement = (ship.deployed) ? this.removeShip(ship.shipId) : null;

		if (this.placementValid({ shipId: ship.shipId, placement: message.placement })) {
			this.placeShip({ shipId: ship.shipId, placement: message.placement });
			this.broadcast({
				signal    : SIGNALS.ACCEPT_DEPLOY,
				id        : this.playerId,
				shipId    : message.shipId,
				placement : message.placement,
			});
		}
		else {
			if (removedPlacement) this.placeShip({ shipId: ship.shipId, placement: removedPlacement });
			this.broadcast({
				signal    : SIGNALS.REJECT_DEPLOY,
				id        : this.playerId,
				shipId    : message.shipId,
				placement : removedPlacement,
			});
		}
	};

	onAcceptRejectDeploy = () => {
		if (this.type === PLAYER_TYPES.COMPUTER) {
			this.broadcast({ signal: SIGNALS.DEPLOY_DONE, id: this.playerId });
		}
	};

	onDeployDone = () => {
		if (this.allShipsDeployed()) {
			this.broadcast({ signal: SIGNALS.WAIT_READY, id: this.playerId });
			if (this.type !== PLAYER_TYPES.COMPUTER) {
				this.broadcast({ signal: SIGNALS.DEPLOY_SHIP, id: this.playerId });
			}
		}
		else {
			this.broadcast({ signal: SIGNALS.DEPLOY_SHIP, id: this.playerId });
		}
	};

	onResetYard = () => {
		this.broadcast({ signal: SIGNALS.RESET_GAME, id: this.playerId });
	};

	onWaitReady = () => {
		switch (this.type) {
			case PLAYER_TYPES.HUMAN: {
				this.broadcast({ signal: SIGNALS.ENABLE_READY, id: this.playerId });
				break;
			}
			case PLAYER_TYPES.COMPUTER: {
				this.broadcast({ signal: SIGNALS.PLAYER_READY });   //TODO refactor messages (Goes to Game)
				break;
			}
		}
	};

	onPlayerReady = () => {
		this.deployingShips = true;
	};

	onSelectTarget = () => {
		switch (this.type) {
			case PLAYER_TYPES.HUMAN: {
				this.broadcast({ signal: SIGNALS.CLICK_TARGET, id: this.playerId });
				break;
			}
			case PLAYER_TYPES.COMPUTER: {
				setTimeout(() => {
					const coords = this.aiChooseTarget();
					this.broadcast({ signal: SIGNALS.TARGET_CHOSEN, id: this.playerId, coords });   //TODO call onTargetChosen directly?
				}, OPTIONS.AI_ATTACK_DELAY);
				break;
			}
		}
	};

	onTargetChosen = (message) => {
		const notYetAttacked = OPTIONS.ATTACK_CELL_TWICE || this.wasNotYetAttacked(message.coords);

		if (notYetAttacked) {
			this.rememberAttack(message.coords);
			this.broadcast({ signal: SIGNALS.PERFORM_ATTACK, attacker: this.playerId, coords: message.coords });
		} else {
			this.broadcast({ signal: SIGNALS.SELECT_TARGET, id: this.playerId });
		}
	};

	onReceiveAttack = (message) => {
		const coords = message.coords;
		const result = this.receiveAttack(coords);
		this.broadcast({ signal: SIGNALS.ANNOUNCE_RESULT, receiverId: this.playerId, ...result });

		const signal = this.allShipsSunk() ? SIGNALS.I_AM_DEAD : SIGNALS.STILL_ALIVE;
		this.broadcast({ signal });
	};


	////////////////
	// PROCEDURES //
	////////////////

	createShips = () => {
		let shipId = 0;
		this.ships = this.shipDefinitions.reduce((prev, definition) => {
			function newShip() {
				++shipId;
				return new Ship({ definition, shipId });
			}
			const newGroup = Array.from({ length: definition.amount }).map(newShip);
			return [...prev, ...newGroup];
		}, []);

		if (DEBUG.CREATE_SHIPS) console.log('Player.createShips:', this.ships);
	};

	clearNotYetAttacked = () => {
		this.notYetAttacked = [];
		for (let x = 0; x < SETTINGS.GRID_SIZE; ++x) {
			for (let y = 0; y < SETTINGS.GRID_SIZE; ++y) {
				this.notYetAttacked.push({x, y});
			}
		}
	};

	rememberAttack = (coords) => {
		const index = this.notYetAttacked.findIndex(entry => entry.x === coords.x && entry.y === coords.y);
		this.notYetAttacked.splice(index, 1);
		const { x, y } = coords;
		this.grid[y][x].wasAttacked = true;
		if (DEBUG.GRIDS) this.debugGrid();
	};

	moveShipsToYard = () => {
		this.grid = Array.from({ length: SETTINGS.GRID_SIZE }).map(() => {
			return Array.from({ length: SETTINGS.GRID_SIZE }).map(() => ({
				wasAttacked : false,  //TODO not needed, UI will keep track anyways
				ship        : null,
			}));
		});

		this.ships.forEach(ship => ship.recall());

		if (DEBUG.GRIDS) this.debugGrid('Player.moveShipsToYard');
	};

	placeShip = ({ shipId, placement }) => {
		const { orientation, coords } = placement;
		const ship = this.ships.find(ship => ship.shipId === shipId);

		if (DEBUG.PLACE_SHIPS) {
			console.groupCollapsed('Player.placeShip:', {shipId, orientation, coords, size: ship.size});
			console.log('ship:', ship);
			console.log('this.ships:', this.ships);
			console.groupEnd();
		}

		ship.deploy(coords, orientation);

		const deltaX = (orientation === 'horizontal') ? 1 : 0;
		const deltaY = (orientation === 'vertical') ? 1 : 0;

		for (let i = 0; i < ship.size; ++i) {
			const x = coords.x + i*deltaX;
			const y = coords.y + i*deltaY;
			this.grid[y][x].ship = ship;
		}

		if (DEBUG.GRIDS) this.debugGrid('Player.placeShip');
	};

	removeShip = (shipId) => {
		const ship = this.ships.find(ship => ship.shipId === shipId);

		const coords = ship.cells[0];
		const orientation = ship.orientation;

		const deltaX = (orientation === 'horizontal') ? 1 : 0;
		const deltaY = (orientation === 'vertical') ? 1 : 0;

		for (let i = 0; i < ship.size; ++i) {
			const x = coords.x + i*deltaX;
			const y = coords.y + i*deltaY;
			this.grid[y][x].ship = null;
			ship.cells[i] = null;
		}

		ship.deployed = false;

		if (DEBUG.GRIDS) this.debugGrid('Player.removeShip');

		return { orientation, coords };
	};

	receiveAttack = (coords) => {
		const { x, y } = coords;
		this.grid[y][x].wasAttacked = true; //TODO not needed, UI will keep track anyways
		const ship = this.grid[y][x].ship;

		if (ship) {
			ship.takeHit(coords);
			const result = ship.isSunk() ? ATTACK_RESULTS.SUNK : ATTACK_RESULTS.HIT;
			const hitCells = ship.isSunk() ? ship.cells : [coords];
			return { result, coords: hitCells };
		} else {
			return { result: ATTACK_RESULTS.MISS, coords: [coords] };
		}
	};


	///////////////////////
	// COMPUTER OPPONENT //
	///////////////////////

	aiDeployShip = () => {
		const ship = this.ships.filter(ship => !ship.deployed)[0];
		let placement;
		do {
			placement = {
				orientation : (Math.random() < 0.5) ? 'horizontal' : 'vertical',
				coords      : {
					x: Math.floor(Math.random() * SETTINGS.GRID_SIZE),
					y: Math.floor(Math.random() * SETTINGS.GRID_SIZE),
				},
			};
		} while (!this.placementValid({ shipId: ship.shipId, placement }));

		return {
			shipId: ship.shipId,
			placement,
		};
	};

	aiChooseTarget = () => {
		const index = Math.floor(Math.random() * this.notYetAttacked.length);
		return this.notYetAttacked[index];
	};


	///////////////////
	// STATE QUERIES //
	///////////////////

	allShipsDeployed = () => {
		const shipsInYard = this.ships.filter(ship => !ship.deployed);
		const allDeployed = (shipsInYard.length === 0);
		return allDeployed;
	};

	placementValid = ({ shipId, placement }) => {
		const { orientation, coords } = placement;
		const ship = this.ships.find(ship => ship.shipId === shipId);
		const placeVertical = (orientation === 'vertical');

		const gridSize = SETTINGS.GRID_SIZE;

		const maxPlaceCoord = gridSize - ship.size;
		if (!placeVertical && (coords.x < 0 || coords.x > maxPlaceCoord)) return false;
		if ( placeVertical && (coords.y < 0 || coords.y > maxPlaceCoord)) return false;

		const from = { x: coords.x - 1, y: coords.y - 1 };
		const to = {
			x: coords.x + (placeVertical ? 1 : ship.size),
			y: coords.y + (placeVertical ? ship.size : 1),
		};
		const insideGrid = (x, y) => x >= 0 && y >= 0 && x < gridSize && y < gridSize;
		const isOccupied = (x, y) => this.grid[y][x].ship !== null;

		let someOccupied = false;
		for (let x = from.x; x <= to.x; ++x) {
			for (let y = from.y; y <= to.y; ++y) {
				someOccupied |= insideGrid(x, y) && isOccupied(x, y);
			}
		}

		if (DEBUG.PLACE_SHIPS) {
			console.log('Player.placementValid:', !someOccupied, {shipId, orientation, coords});
		}

		return !someOccupied;
	};

	wasNotYetAttacked = (coords) => {
		const entry = this.notYetAttacked.find(entry => entry.x === coords.x && entry.y === coords.y);
		return (entry !== null);
	};

	allShipsSunk = () => {
		const stillAlive = ship => !ship.isSunk();
		const someSurvive = this.ships.find(stillAlive);
		return !someSurvive;
	};


	///////////
	// DEBUG //
	///////////

	debugGrid = (heading = '') => {
		if (!DEBUG.GRIDS) return;

		if (heading) heading = ': ' + heading;

		console.group(
			`%cPlayer ${this.playerId} ${this.type} %c${this.name}%c${heading}`,
			'color:unset', 'color:' + this.color, 'color:unset',
		);

		console.log('%c   0  1  2  3  4  5  6  7  8  9        0  1  2  3  4  5  6  7  8  9', 'color:#6d6');
		this.grid.forEach( (row, rowIndex)=>{
			const player = row.map( (cell)=>{
				if (cell.ship) {
					if (cell.ship.isSunk()) return ' # ';
					return (cell.wasAttacked) ? ' X ' : ' O ';
				} else {
					return (cell.wasAttacked) ? ' ~ ' : ' · ';
				}
			}).join('');

			const attacks = row.map( (cell, colIndex)=>{
				const found = this.notYetAttacked.find( (coords)=>{
					return (coords.x === colIndex) && (coords.y === rowIndex);
				});
				return (found) ? ' · ' : ' ~ ';
			}).join('');

			console.log(rowIndex, player, '  ', rowIndex, attacks);
		});

		console.log('this.ships:', this.ships);

		console.groupEnd();
	};

}

//EOF