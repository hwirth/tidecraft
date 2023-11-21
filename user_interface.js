// user_interface.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

import { SETTINGS, OPTIONS, DEBUG, SHIP_DEFINITION } from './configuration.js';
import { createDOMStructure } from './dom_structure.js';

let instanceNr = 0;


export class UserInterface {
    callback;
    elements;

    constructor(callbacks) {
        instanceNr += 1;
        if (DEBUG.INSTANCES) console.log(
            '%cUserInterface init, instance nr.', 'color:#fc0', instanceNr,
        );

        this.callback = callbacks;

        document.body.classList.add('fade');
        document.body.classList.toggle('images', SETTINGS.BACKGROUND_IMAGES);
        document.body.classList.toggle('zoom', SETTINGS.FILL_SCREEN);

        if (SETTINGS.CALCULATE_FONT_SIZE) addEventListener('resize', ()=>{
            if (SETTINGS.FILL_SCREEN) {
                const vmin = Math.min( window.innerHeight, window.innerWidth );
                const fontSize = SETTINGS.ZOOM_FONT_VMIN / 100;
                document.body.style.fontSize = Math.floor(vmin * fontSize) + 'px'
            }
        });

        createDOMStructure(SHIP_DEFINITION);

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
            if (selector.slice(0,3) === 'ALL') {
                return {...prev, [name]: document.querySelectorAll(selector.slice(4))};
            } else {
                return {...prev, [name]: document.querySelector(selector)};
            }
        }, {} );

        this.elements.btnOrientation.addEventListener('mouseup', this.onOrientationClick);
        this.elements.btnShipsToYard.addEventListener('mouseup', this.moveShipsToYard);
        this.elements.ships.forEach( (ship)=>{
            ship.addEventListener('mousedown', this.onShipDragStart);
        });
        this.elements.btnReady    .addEventListener('mouseup', this.callback.playerReady);
        this.elements.btnNewGame  .addEventListener('mouseup', this.callback.newGame);
        this.elements.opponentGrid.addEventListener('mouseup', this.onOpponentGridClick);

        this.setCurrentAttacker(null);
        document.body.classList.remove('fade');
    }

    exit() {
        this.elements.btnOrientation.removeEventListener('mouseup', this.onOrientationClick);
        this.elements.btnShipsToYard.removeEventListener('mouseup', this.moveShipsToYard);
        this.elements.ships.forEach( (ship)=>{
            ship.removeEventListener('mousedown', this.onShipDragStart);
        });
        this.elements.btnReady    .removeEventListener('mouseup', this.callback.playerReady);
        this.elements.btnNewGame  .removeEventListener('mouseup', this.callback.newGame);
        this.elements.opponentGrid.removeEventListener('mouseup', this.onOpponentGridClick);

        if (DEBUG.INSTANCES) console.log(
            '%cUserInterface exit, instance nr.', 'color:#f00', instanceNr,
        );

        document.body.classList.add('fade');
        return new Promise(done => setTimeout(done, SETTINGS.BODY_FADE_TIME*2));
    }

    enableElement(element, enabled) {
        if (enabled) {
            element.removeAttribute('disabled');
        } else {
            element.setAttribute('disabled', '');
        }
    }

    setGamePhase = this.setGamePhase.bind(this);
    setGamePhase(phaseName) {
        document.body.classList.remove('deploy', 'waitready', 'battle', 'defeat', 'victory');
        document.body.classList.add(phaseName);
        this.enableElement(this.elements.btnOrientation, phaseName === 'deploy');
        this.enableElement(this.elements.btnShipsToYard, phaseName === 'deploy' || phaseName === 'waitready');
        this.enableElement(this.elements.btnReady, phaseName == 'waitready');
    }

    setReadyEnabled(enabled) {
        this.enableElement(this.elements.btnReady, enabled);
    }

    setClearEnabled(enabled) {
        this.enableElement(this.elements.btnShipsToYard, enabled);
    }

    setCurrentAttacker(className) {
        document.body.classList.toggle('player1', className === 'player1');
        document.body.classList.toggle('player2', className === 'player2');
    }

    findCoords(target) {
        const gridElement = target.closest('table');
        const rowElements = gridElement.querySelectorAll('tr');

        const targetRow = target.closest('tr');
        const rowIndex = [...rowElements].indexOf(targetRow);

        const cells = targetRow.querySelectorAll('td');
        const cellIndex = [...cells].indexOf(target);

        return { x:cellIndex, y:rowIndex };
    }

    findCell(grid, coords) {
        const x = coords.x + 1;
        const y = coords.y + 1;
        const selector = `tr:nth-of-type(${y}) td:nth-of-type(${x})`;
        const cell = grid.querySelector(selector);
        return cell;
    }

    moveShipsToYard = this.moveShipsToYard.bind(this);
    moveShipsToYard() {
        const bySize = (a, b) => {
            const squaresA = a.querySelectorAll('span').length;
            const squaresB = b.querySelectorAll('span').length;
            return (squaresA === squaresB) ? 0 : (squaresB - squaresA);
        }
        const sortedShips = [...this.elements.ships].toSorted( bySize );

        sortedShips.forEach( (ship, index)=>{
            ship.classList.remove('horizontal');
            ship.classList.add('vertical');
            const slot = this.elements.yardSlots[index];
            slot.appendChild(ship);
        });

        this.elements.allCells.forEach(cell => cell.className = '')  //...? Still in use?
        this.elements.yard.classList.remove('horizontal');
        this.elements.yard.classList.add('vertical');
        this.callback.clearBoard();
    }

    onOrientationClick = this.onOrientationClick.bind(this);
    onOrientationClick(event) {
        [this.elements.yard, ...this.elements.ships].forEach(ship => {
            if (ship.closest('.yard')) {
                ship.classList.toggle('vertical')
                ship.classList.toggle('horizontal')
            }
        });
    }

    onShipDragStart = this.onShipDragStart.bind(this);
    onShipDragStart (event) {
        if (!this.callback.dragShipsAllowed()) return;

        const shipSquare = event.target;
        if (shipSquare.tagName !== 'SPAN') return;

        const ship = shipSquare.closest('.ship');
        const yard = ship.closest('.yard') || ship.closest('table');
        if (!ship || !yard || event.button !== 0) return;

        const squares = ship.querySelectorAll('span');
        const squareIndex = [...squares].indexOf(shipSquare);
        const shipSize = squares.length;
        const orientation = ship.classList.contains('vertical') ? 'vertical' : 'horizontal';

        const grid = ship.closest('table.player');
        let initialCoords = null;
        if (grid) {
            const cell = ship.closest('td');
            initialCoords = this.findCoords(cell);
            this.callback.removeShipAt(initialCoords);
        }

        const initialShipX = ship.offsetLeft;
        const initialShipY = ship.offsetTop;
        const initialMouseX = event.screenX;
        const initialMouseY = event.screenY;
        const initialLayerX = event.layerX + 1; //TODO No idea, why it is offset.
        const initialLayerY = event.layerY + 1; //TODO I guess because of table/td

        // Needs to be arrow function, so we can access this, and remove the event listener See [1] below.
        const onMouseMove = (event)=>{
            const deltaX = event.screenX - initialMouseX;
            const deltaY = event.screenY - initialMouseY;

            const hoveredCell = this.elements.playerGrid.querySelector('td:hover');
            const offsetX = (hoveredCell) ? event.layerX - initialLayerX : 0;
            const offsetY = (hoveredCell) ? event.layerY - initialLayerY : 0;

            ship.style.left = `${initialShipX + deltaX - offsetX}px`;
            ship.style.top = `${initialShipY + deltaY - offsetY}px`;
        }

        const onMouseUp = (event)=>{
            removeEventListener('mousemove', onMouseMove);
            removeEventListener('mouseup', onMouseUp);
            ship.style.left = '';
            ship.style.top = '';
            ship.classList.remove('dragged');

            let allowed = false;
            if ((event.target.tagName === 'TD') && event.target.closest('.player')) {
                const dropCoords = this.findCoords(event.target);

                let adjustedCoords;
                if (orientation === 'horizontal') {
                    adjustedCoords = {x: dropCoords.x - squareIndex, y: dropCoords.y};
                } else {
                    adjustedCoords = {x: dropCoords.x, y: dropCoords.y - squareIndex};
                }

                allowed = this.callback.placementValid(adjustedCoords, shipSize, orientation);
                if (allowed) {
                    const targetCell = this.findCell(this.elements.playerGrid, adjustedCoords);
                    targetCell.appendChild(ship);

                    // This might trigger the next game phase (battle):
                    this.callback.placeShip(adjustedCoords, shipSize, orientation);
                }
            }

            if (!allowed && initialCoords) {
                // Placement failed, and was already on the grid: Restore ship to original position
                this.callback.placeShip(initialCoords, shipSize, orientation);
            }
        }

        addEventListener('mousemove', onMouseMove); // [1] Cannot bind(this) here,
        addEventListener('mouseup', onMouseUp);     // lest we can't remove the listener
        ship.classList.add('dragged');
    }

    onOpponentGridClick = this.onOpponentGridClick.bind(this);
    onOpponentGridClick(event) {
        const notLeftButton = (event.button !== 0);
        const notACell = (event.target.tagName !== 'TD');
        const alreadyAttacked = event.target.classList.contains('attacked') && !OPTIONS.ATTACK_CELL_TWICE;
        if (notLeftButton || notACell || alreadyAttacked) return;

        const coords = this.findCoords(event.target);
        this.callback.attackOpponent(coords);
    }

    animateAttack(cell, result) {
        if (result === 'attacked hit sunk') {
            cell.className = 'attacked hit';
            setTimeout( ()=>cell.className = result, SETTINGS.ANIMATE_ATTACK_TIME );
        } else {
            cell.className = result;
        }
    }

    showAttackResult({coords, result, ship}) {
        const cell = this.findCell(this.elements.opponentGrid, coords);
        cell.className = result;
        if (ship) {
            ship.cells.forEach((shipCoords)=>{
                const cell = this.findCell(this.elements.opponentGrid, shipCoords);
                this.animateAttack(cell, result);
            });
        }
    }

    showReceivedAttack({coords, result, ship}) {
        const cell = this.findCell(this.elements.playerGrid, coords);
        cell.className = result;
        if (DEBUG.ATTACKS) console.log('showReceivedAttack: ship:', ship)
        if (ship) {
            ship.cells.forEach((shipCoords)=>{
                const cell = this.findCell(this.elements.playerGrid, shipCoords);
                this.animateAttack(cell, result);
            });
        }
    }
}

//EOF