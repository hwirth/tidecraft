// player.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

import { OPTIONS, DEBUG, SHIP_DEFINITION } from './configuration.js';

class GridCell {
    wasAttacked;
    ship;

    constructor () {
        this.wasAttacked = false;
        this.ship = null;
    }
}

// Created, once placed
class Ship {
    orientation;
    cells;
    size;
    hits;

    constructor(orientation) {
        this.orientation = orientation;

        this.cells = [];
        this.size = 0;
        this.hits = 0;
    }

    addCell(coords) {
        this.cells.push(coords);
        this.size = this.cells.length;
    }

    takeHit(coords) {
        this.hits += 1;
    }

    isSunk() {
        return (this.hits === this.cells.length);
    }
}

export class Player {
    callback;
    name;
    playerNr;
    grid;
    ships;
    nrShipsInYard;
    nrRemainingShips;
    notYetAttacked;

    constructor ({name, type, playerNr, callbacks}) {
        this.callback = callbacks;

        this.name = name;
        this.type = type;
        this.playerNr = playerNr;

        this.reset();
    }

    reset = this.reset.bind(this);
    reset() {
        console.log( 'Player reset:', this.name );

        this.grid = Array.from({ length: 10 }).map( (row)=>{
            return Array.from({ length: 10 }).map( (cell)=>{
                return new GridCell();
            });
        });

        this.notYetAttacked = [];
        for (let x = 0; x < 10; ++x) {
            for (let y = 0; y < 10; ++y) {
                this.notYetAttacked.push({x, y});
            }
        }

        this.ships = [];

        this.nrShipsInYard
        = this.nrRemainingShips
        = SHIP_DEFINITION.reduce( (accumulator, entry)=>{
            return accumulator + entry.amount;
        }, 0);
    }

    checkShipsPlaced() {
        // Will be called after player placed a ship
        // and resolve allShipsPlaced(), when all ships were placed
    }

    allShipsPlaced() {
        if (this.type == 'ai') {
            this.aiPlaceShips();
            return Promise.resolve();
        }

        return new Promise( (done)=>{
            this.checkShipsPlaced = (nrShipsInYard)=>{
                if (DEBUG.SHIPYARD) console.log('nrShipsInYard:', nrShipsInYard)
                if (nrShipsInYard === 0) {
                    done();
                }
            };
        })
    }

    placeShip = this.placeShip.bind(this);
    placeShip(coords, size, orientation) {
        const deltaX = (orientation === 'horizontal') ? 1 : 0;
        const deltaY = (orientation === 'vertical') ? 1 : 0;

        const newShip = new Ship(orientation);

        for (let i = 0; i < size; ++i) {
            const x = coords.x + i*deltaX;
            const y = coords.y + i*deltaY;
            this.grid[y][x].ship = newShip;
            newShip.addCell({x, y});
        }

        if (DEBUG.PLACE_SHIPS) console.log('Player.placeShip: newShip:', size, orientation, newShip);

        // Don't add a new ship, when it wasn't dragged from the shipyard
        if (this.ships.indexOf(newShip) < 0) {
            this.ships.push( newShip );
        }

        this.nrShipsInYard -= 1;
    }

    removeShipAt = this.removeShipAt.bind(this);
    removeShipAt(coords) {
        const { ship, size, orientation } = this.findShipAt(coords);

        const deltaX = (orientation === 'horizontal') ? 1 : 0;
        const deltaY = (orientation === 'vertical') ? 1 : 0;

        for (let i = 0; i < size; ++i) {
            const x = coords.x + i*deltaX;
            const y = coords.y + i*deltaY;
            this.grid[y][x].ship = null;
        }

        const index = this.ships.indexOf(ship);
        this.ships.splice(index, 1);

        if (DEBUG.PLACE_SHIPS) console.log('Player.removeShipAt:', coords, size, orientation);
        if (DEBUG.GRIDS) this.debugGrid('Removed ship');

        this.nrShipsInYard += 1;
    }

    findShipAt = this.findShipAt.bind(this);
    findShipAt(coords) {
        const ship = this.ships.find( (ship)=>{
                const hasCoords = ship.cells.find( (cell)=>{
                    return (cell.x === coords.x) && (cell.y === coords.y);
                });
                return hasCoords;
        });

        if (!ship) throw new Error('Player.findShipAt: no ship at:', coords);

        return {
            ship: ship,
            coords: ship.cells[0],
            size: ship.size,
            orientation: ship.orientation,
        };
    }

    aiPlaceShips = this.aiPlaceShips.bind(this);
    aiPlaceShips() {
        SHIP_DEFINITION.forEach( (type)=>{
            for (let i=0; i < type.amount; ++i) {
                if (DEBUG.SHIP_DEFINITION) console.log( 'Create ship:', type );
                let x, y, orientation;
                do {
                    orientation = (Math.random() < 0.5) ? 'horizontal' : 'vertical';
                    x = Math.floor(Math.random() * 10);
                    y = Math.floor(Math.random() * 10);
                } while (this.callback.aiPlacedInvalid({x, y}, type.size, orientation));

                this.callback.aiPlaceShip({x, y}, type.size, orientation);
                //this.placeShip(this, {x, y}, type.size, orientation);
            }
        })
    }

    rememberAttack = this.rememberAttack.bind(this);
    rememberAttack(coords) {
        const {x, y} = coords;
        const index = this.notYetAttacked.findIndex( (entry)=>{
            return (entry.x === coords.x) && (entry.y === coords.y);
        })
        this.notYetAttacked.splice(index, 1);
        if (DEBUG.ATTACKS) console.log('rememberAttack:', this.name, this.notYetAttacked.length);
    }

    receiveAttack(coords) {
        const {y, x} = coords;
        const cell = this.grid[y][x];
        cell.wasAttacked = true;
        if (cell.ship) {
            cell.ship.takeHit(coords);
            if (cell.ship.isSunk()) {
                this.nrRemainingShips -= 1;
                return {coords, result:'attacked hit sunk', ship:cell.ship};
            } else {
                return {coords, result:'attacked hit'};
            }
        }
        return {coords, result:'attacked'};
    }

    allShipsSunk() {
        return (this.nrRemainingShips === 0);
    }

    aiAttack = this.aiAttack.bind(this);
    aiAttack() {
        const index = Math.floor( Math.random() * (this.notYetAttacked.length - 1) );
        const coords = this.notYetAttacked[index];
        setTimeout( ()=>this.callback.attackOpponent(coords), OPTIONS.AI_ATTACK_DELAY);
    }

    debugGrid = this.debugGrid.bind(this);
    debugGrid(heading = '') {
        if (heading) heading = ': ' + heading;

        console.group(
            `%cPlayer ${this.playerNr} ${this.type} %c${this.name}%c${heading}`,
            'color:unset', 'color:#fc0', 'color:unset',
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

        console.groupEnd();
    }
}

//EOF