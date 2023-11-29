// ship.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { DEBUG } from './configuration.js';

export class Ship {
	shipId;
	cells;
	size;
	deployed;
	hits;

	constructor({ definition, shipId }) {
		this.shipId = shipId;
		this.size   = definition.size;
		this.cells  = Array.from({ length: definition.size });
		this.recall();

		if (DEBUG.CREATE_SHIPS) console.log('new Ship():', { shipId, ...definition });
	}

	deploy = ({ coords, orientation }) => {
		const deltaX = (orientation === 'horizontal') ? 1 : 0;
		const deltaY = (orientation === 'vertical') ? 1 : 0;

		this.cells = this.cells.map((_, index) => ({
			x: coords.x + index*deltaX,
			y: coords.y + index*deltaY,
			wasHit: false,
		}));

		this.orientation = orientation;
		this.deployed = true;
	};

	recall = () => {
		this.orientation = null;
		this.deployed    = false;
		this.cells       = this.cells.map(() => null);
		this.hits        = 0;
	};

	takeHit = (coords) => {
		const hasCoords = cell => cell.x === coords.x && cell.y === coords.y;
		const cell = this.cells.find(hasCoords);
		if (!cell.wasHit) this.hits += 1;
		cell.wasHit = true;
	};

	isSunk = () => {
		return (this.hits === this.cells.length);
	};
}

//EOF