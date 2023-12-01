// user_interface.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { DEBUG, SETTINGS, OPTIONS } from './configuration.js';
import { SIGNALS, GAME_PHASES, ATTACK_RESULTS } from './configuration.js';
import { createDOMStructure } from './dom_structure.js';
import { Sounds } from './sounds.js';

export class UserInterface {
	broadcast;
	userId;
	sounds;
	canDeploy;
	canAttack;

	constructor({ messageBroker, shipDefinitions, playerId }) {
		this.broadcast = messageBroker.subscribe({
			sender: this, id: playerId, messageHandlers: {
				[SIGNALS.RESET_BOARD]     : this.onResetBoard,
				[SIGNALS.START_PLACING]   : this.onStartPlacing,
				[SIGNALS.ACCEPT_DEPLOY]   : this.onAcceptDeploy,
				[SIGNALS.REJECT_DEPLOY]   : this.onRejectDeploy,
				[SIGNALS.ENABLE_READY]    : this.onEnableReady,
				[SIGNALS.PLAYER_READY]    : this.onPlayerReady,
				[SIGNALS.CURRENT_PLAYER]  : this.onCurrentPlayer,
				[SIGNALS.CLICK_TARGET]    : this.onClickTarget,
				[SIGNALS.ANNOUNCE_RESULT] : this.onAnnounceResult,
				[SIGNALS.DISPLAY_DEFEAT]  : this.onDisplayDefeat,
				[SIGNALS.DISPLAY_VICTORY] : this.onDisplayVictory,
			},
		});

		this.playerId = playerId;

		this.init(shipDefinitions);  // Dispatch async init
	}

	init = async(shipDefinitions) => {
		if (SETTINGS.CALCULATE_FONT_SIZE) addEventListener('resize', ()=>{
			if (SETTINGS.FILL_SCREEN) {
				const vmin = Math.min( window.innerHeight, window.innerWidth );
				const fontSize = SETTINGS.ZOOM_FONT_VMIN / 100;
				document.body.style.fontSize = Math.floor(vmin * fontSize) + 'px';
			}
		});

		createDOMStructure(shipDefinitions);

		const selectors = {
			btnOrientation : '[name=orientation]',
			btnShipsToYard : '[name=clearboard]',
			btnReady       : '[name=ready]',
			btnNewGame     : '[name=newgame]',
			board          : '.board',
			allCells       : 'ALL td',
			opponentGrid   : '.grid.opponent',
			playerGrid     : '.grid.player',
			playerRows     : 'ALL .grid.player tr',
			yard           : '.yard',
			yardSlots      : 'ALL .yard li',
			ships          : 'ALL div.ship',
		};

		this.elements = Object.entries( selectors ).reduce( (prev, [name, selector])=>{
			return (
				(selector.slice(0,3) === 'ALL')
					? {...prev, [name]: document.querySelectorAll(selector.slice(4))}
					: {...prev, [name]: document.querySelector(selector)}
			);
		}, {});

		this.setButtonsEnabled({
			btnOrientation : true,
			btnShipsToYard : false,
			btnReady       : false,
		});

		this.elements.btnOrientation.addEventListener('mouseup', this.onOrientationClick);
		this.elements.btnShipsToYard.addEventListener('mouseup', this.onMoveShipsToYardClick);
		this.elements.ships.forEach( (ship)=>{
			ship.addEventListener('mousedown', this.onShipDragStart);
		});
		this.elements.btnReady    .addEventListener('mouseup', this.onPlayerReadyClick);
		this.elements.btnNewGame  .addEventListener('mouseup', this.onNewGameClick);
		this.elements.opponentGrid.addEventListener('mouseup', this.onOpponentGridClick);
		addEventListener('keydown', this.onKeyDown);

		this.setCurrentPlayer(null);
		this.canDeploy = false;
		this.canClickTarget = false;

		document.body.classList.toggle('images', SETTINGS.BACKGROUND_IMAGES);
		document.body.classList.toggle('zoom', SETTINGS.FILL_SCREEN);

		this.sounds = await new Sounds();

		document.body.classList.remove('fade');
		setTimeout(()=>this.broadcast({ signal: SIGNALS.UI_READY }), SETTINGS.BODY_FADE_TIME);
	};

	/*eslint-disable-next-line indent*/
// MESSAGES //////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	onResetBoard = () => {
		this.setGamePhase(GAME_PHASES.DEPLOY);
		this.setButtonsEnabled({
			btnOrientation : true,
			btnShipsToYard : false,
			btnReady       : false,
		});
		this.moveShipsToYard();
		this.broadcast({ signal: SIGNALS.READY_TO_DEPLOY, id: this.playerId });
		this.canDeploy = false;
		this.canAttack = false;
	};

	onStartPlacing = () => {
		this.canDeploy = true;
		if (DEBUG.UI) console.log('UserInterface.onStartPlacing: canDeploy:', this.canDeploy);
	};

	onRejectDeploy = (message) => {
		const ship = this.findShipById(message.shipId);
		this.dragDropRelease(ship);
		if (message.placement === null) {
			const slot = this.findYardSlotById(message.shipId);
			slot.appendChild(ship);
			this.broadcast({ signal: SIGNALS.DEPLOY_DONE, id: this.playerId });
		} else {
			this.onAcceptDeploy(message);
		}
	};

	onAcceptDeploy = (message) => {
		const ship = this.findShipById(message.shipId);
		this.dragDropRelease(ship);
		const targetCell = this.findGridCell(this.elements.playerGrid, message.placement.coords);
		targetCell.appendChild(ship);
		this.setButtonsEnabled({ btnShipsToYard: true });
		this.broadcast({ signal: SIGNALS.DEPLOY_DONE, id: this.playerId });
	};

	onEnableReady = () => {
		this.setGamePhase(GAME_PHASES.WAIT_READY);
		this.setButtonsEnabled({
			btnOrientation : false,
			btnReady       : true,
		});
	};

	onPlayerReady = (message) => {
		if (message.playerId) {
			this.setGamePhase(
				message.playerId === this.playerId
					? GAME_PHASES.WAIT_OPPONENT
					: GAME_PHASES.OPPONENT_READY
			);
		}

		if (message.id !== this.playerId) return;   //TODO refactor messages (This is also sent without id to Game)

		this.setButtonsEnabled({
			btnOrientation : false,
			btnShipsToYard : false,
			btnReady       : false,
		});
		this.canDeploy = false;
		if (DEBUG.UI) console.log('UserInterface.onPlayerReady: canDeploy:', this.canDeploy);
	};

	onCurrentPlayer = (message) => {
		if (message.currentPlayerId !== null) this.setGamePhase(GAME_PHASES.BATTLE);
		this.setCurrentPlayer(message.currentPlayerId);
	};

	onClickTarget = () => {
		this.canAttack = true;
		if (DEBUG.UI) console.log('UserInterface.onClickTarget: %ccanAttack:', 'color:green', this.canAttack);
	};

	onAnnounceResult = (message) => {
		const table = (message.receiverId === this.playerId) ? this.elements.playerGrid : this.elements.opponentGrid;
		const className = {
			[ATTACK_RESULTS.MISS] : 'attacked',
			[ATTACK_RESULTS.HIT]  : 'attacked hit',
			[ATTACK_RESULTS.SUNK] : 'attacked hit sunk',
		}[message.result];

		const findCell = coords => this.findGridCell(table, coords);
		const cells = message.coords.map(findCell);
		cells.forEach(cell => cell.className = className);

		this.sounds.play(message.result);
	};

	onDisplayDefeat = () => {
		this.setGamePhase(GAME_PHASES.DEFEAT);
	};

	onDisplayVictory = () => {
		this.setGamePhase(GAME_PHASES.VICTORY);
	};

	/*eslint-disable-next-line indent*/
// UI EVENTS /////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	onOrientationClick = () => {
		if (!this.canDeploy) return;

		function toggleOrientation(element) {
			element.classList.toggle('vertical');
			element.classList.toggle('horizontal');
		}

		toggleOrientation(this.elements.yard);

		const inYard = ship => ship.closest('.yard') !== null;
		[...this.elements.ships].filter(inYard).forEach(toggleOrientation);
	};

	onMoveShipsToYardClick = () => {
		this.broadcast({ signal: SIGNALS.RESET_YARD, id: this.playerId });
	};

	onShipDragStart = (event) => {
		if (!this.canDeploy) return;

		const shipCell = event.target;
		if (shipCell.tagName !== 'SPAN') return;

		const ship = shipCell.closest('.ship');
		const yard = ship.closest('.yard') || ship.closest('table');
		if (!ship || !yard || event.button !== 0) return;

		const shipId      = parseInt(ship.dataset.shipId, 10);
		const cellIndex   = shipCell.dataset.cellIndex;
		const orientation = ship.classList.contains('vertical') ? 'vertical' : 'horizontal';

		const initialShipX = ship.offsetLeft;
		const initialShipY = ship.offsetTop;
		const initialMouseX = event.screenX;
		const initialMouseY = event.screenY;
		const initialLayerX = event.layerX + 1; //TODO No idea, why it is offset.
		const initialLayerY = event.layerY + 1; //TODO I guess because of table/td

		const onMouseMove = (event)=>{
			const deltaX = event.screenX - initialMouseX;
			const deltaY = event.screenY - initialMouseY;

			const hoveredCell = this.elements.playerGrid.querySelector('td:hover');
			const offsetX = (hoveredCell) ? event.layerX - initialLayerX : 0;
			const offsetY = (hoveredCell) ? event.layerY - initialLayerY : 0;

			ship.style.left = `${initialShipX + deltaX - offsetX}px`;
			ship.style.top = `${initialShipY + deltaY - offsetY}px`;
		};

		const onMouseUp = (event) => {
			removeEventListener('mousemove', onMouseMove);
			removeEventListener('mouseup', onMouseUp);

			if ((event.target.tagName === 'TD') && event.target.closest('.player')) {
				const dropCoords = this.findGridCoords(event.target);

				const adjustedCoords = (orientation === 'horizontal')
					? { x: dropCoords.x - cellIndex, y: dropCoords.y}
					: { x: dropCoords.x, y: dropCoords.y - cellIndex}
				;

				const placement = { coords : adjustedCoords, orientation };
				this.broadcast({ signal: SIGNALS.PLACE_SHIP, id: this.playerId, shipId, placement });
			}
			else {
				this.dragDropRelease(ship);
			}
		};

		addEventListener('mousemove', onMouseMove);
		addEventListener('mouseup', onMouseUp);
		ship.classList.add('dragged');
	};

	dragDropRelease = (ship) => {
		ship.style.left = '';
		ship.style.top = '';
		ship.classList.remove('dragged');
	};

	onPlayerReadyClick = () => {
		this.broadcast({ signal: SIGNALS.PLAYER_READY, id: this.playerId });
		this.broadcast({ signal: SIGNALS.PLAYER_READY, playerId: this.playerId });
	};

	onNewGameClick = () => {
		this.broadcast({ signal: SIGNALS.RESET_GAME });
	};

	onOpponentGridClick = (event) => {
		if (!this.canAttack) return;

		this.canAttack = false;
		if (DEBUG.UI) console.log('UserInterface.onOpponentGridClick: %ccanAttack:', 'color:red', this.canAttack);

		const notLeftButton = (event.button !== 0);
		const notACell = (event.target.tagName !== 'TD');
		const alreadyAttacked = event.target.classList.contains('attacked') && !OPTIONS.ATTACK_CELL_TWICE;
		if (notLeftButton || notACell || alreadyAttacked) return;

		const coords = this.findGridCoords(event.target);
		this.broadcast({ signal: SIGNALS.TARGET_CHOSEN, id: this.playerId, coords });
	};

	onKeyDown = (event) => {
		console.log(event);   //TODO
		switch (event.key) {
			case 'i': {
				document.body.classList.toggle('images');
				break;
			}
		}
	};

	/*eslint-disable-next-line indent*/
// PROCEDURES ////////////////////////////////////////////////////////////////////////////////////////////////////119:/

	moveShipsToYard = () => {
		const byId = (a, b) => (a.shipId === b.shipId) ? 0 : (b.shipId - a.shipId);
		const sortedShips = [...this.elements.ships].toSorted(byId);

		sortedShips.forEach((ship, index) => {
			ship.classList.remove('horizontal');
			ship.classList.add('vertical');
			const slot = this.elements.yardSlots[index];
			slot.appendChild(ship);
		});

		this.elements.allCells.forEach(cell => cell.className = '');  //...? Still in use? Maybe not when placing
		this.elements.yard.classList.remove('horizontal');
		this.elements.yard.classList.add('vertical');
	};

	findGridCell = (table, coords) => {
		return table.querySelector(`[data-row="${coords.y}"] [data-column="${coords.x}"]`);
	};

	findGridCoords = (target) => {
		return {
			x: parseInt(target.closest('td').dataset.column, 10),
			y: parseInt(target.closest('tr').dataset.row   , 10),
		};
	};

	findYardSlotById = (slotId) => {
		const index = parseInt(slotId, 10) - 1;
		const slot = this.elements.yardSlots[index];
		return slot;
	};

	findShipById = (shipId) => {
		const withId = ship => ship.dataset.shipId === String(shipId);
		const ship = [...this.elements.ships].find(withId);
		return ship;
	};

	/*eslint-disable-next-line indent*/
// DOM HELPERS ///////////////////////////////////////////////////////////////////////////////////////////////////119:/

	enableElement = (element, enabled) => {
		if (enabled) {
			element.removeAttribute('disabled');
		} else {
			element.setAttribute('disabled', '');
		}
	};

	setButtonsEnabled = (buttons) => {
		Object.entries(buttons).forEach(([button, enabled]) => {
			this.enableElement(this.elements[button], enabled);
		});
	};

	setGamePhase = (phaseName) => {
		if (DEBUG.GAME_PHASES) console.log('UserInterface.setGamePhase:', phaseName);
		const phaseClassNames = Object.values(GAME_PHASES);
		document.body.classList.remove(...phaseClassNames);
		document.body.classList.add(phaseName);
	};

	setCurrentPlayer = (currentPlayerId) => {
		document.body.classList.remove('attacking', 'receiving');
		if (currentPlayerId === null) return;
		if (currentPlayerId === this.playerId) document.body.classList.add('attacking');
		if (currentPlayerId !== this.playerId) document.body.classList.add('receiving');
	};

}

//EOF