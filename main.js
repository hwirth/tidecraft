// main.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

import { PROGRAM_NAME, PROGRAM_VERSION, SETTINGS, OPTIONS, DEBUG } from './configuration.js';

import { UserInterface } from './user_interface.js';
import { Player } from './player.js';
import { Game } from './game.js';

export class Application {
    game = null;
    ui = null;

    constructor () {
        console.log( `%c${PROGRAM_NAME} v${PROGRAM_VERSION}`, 'color:green');

        document.body.innerHTML = '';   // Remove noscript message
        addEventListener('keydown', this.onKeyDown);

        setTimeout( this.startNewGame, SETTINGS.BODY_FADE_TIME );
    }


// RESTART ////////////////////////////////////////////////////////////////////////////////////100:/

    startNewGame = this.startNewGame.bind(this);
    async startNewGame() {
        console.log( 'Starting new game');

        if (this.game) this.game.exit();
        if (this.ui) await this.ui.exit();

        const player1isHuman = OPTIONS.PLAYER1_HUMAN;

        const human = new Player({
            name     : 'Alice',
            type     : 'human',
            playerNr : (player1isHuman) ? 1 : 2,
        });

        const computer = new Player({
            name      : 'Bob',
            type      : 'ai',
            playerNr  : (player1isHuman) ? 2 : 1,
            callbacks : {
                aiPlacedInvalid : (...params) => !this.game.placementValid(this.game.computerPlayer, ...params),//TODO move to Player?
                aiPlaceShip     : this.aiPlaceShip,
                attackOpponent  : this.aiAttack,
            },
        });

        this.game = new Game({
            player1: (player1isHuman) ? human : computer,
            player2: (player1isHuman) ? computer : human,
        });

        this.ui = new UserInterface({
            placementValid   : (...params) => this.game.placementValid(this.game.humanPlayer, ...params),
            dragShipsAllowed : this.game.dragShipAllowed,
            placeShip        : this.playerPlaceShip,
            removeShipAt     : this.game.humanPlayer.removeShipAt,
            clearBoard       : this.clearPlayerBoard,
            attackOpponent   : this.playerAttack,
            playerReady      : this.game.humanPlayer.onReadyClick,
            newGame          : this.startNewGame,
        });

        this.setGamePhase('deploy');
        this.ui.setClearEnabled(false);

        const playersReady = [
                this.game.humanPlayer.isReady(),
                this.game.computerPlayer.isReady(),
        ];

        if (DEBUG.TURNS) console.log('%cWaiting for ship deployment', 'color:green');
        if (DEBUG.GRIDS) this.game.computerPlayer.debugGrid('AI placement');

        await Promise.all(playersReady);

        if (DEBUG.TURNS) console.log('%cPlayers ready', 'color:green');

        this.setGamePhase('battle');
        this.ui.setCurrentAttacker(player1isHuman ? 'player1' : 'player2');
        this.game.nextPlayer();
    }


// GLUE LOGIC /////////////////////////////////////////////////////////////////////////////////100:/

    setGamePhase = this.setGamePhase.bind(this);
    setGamePhase(newMode) {
        if (DEBUG.GAME_PHASE) console.log('%cApplication.setGamePhase:', 'color:blue', newMode);
        const ready = (this.game.humanPlayer.nrShipsInYard === 0);
        this.ui.setGamePhase(newMode);
        this.game.setGamePhase(newMode);
    }

    clearPlayerBoard = this.clearPlayerBoard.bind(this);
    clearPlayerBoard() {
        if (this.game.phase !== 'deploy' && this.game.phase !== 'waitready') return;

        this.game.humanPlayer.moveShipsToYard();
        this.ui?.setGamePhase('deploy');   //TODO Can we have us not called before ui exists?

        if (DEBUG.GRIDS) this.game.humanPlayer.debugGrid('Bord cleared');
    }

    playerPlaceShip = this.playerPlaceShip.bind(this);
    playerPlaceShip(coords, shipSize, orientation) {
        if (DEBUG.PLACE_SHIPS) console.log( 'App.playerPlaceShip:', coords, shipSize, orientation);

        const player = this.game.humanPlayer;
        player.placeShip(coords, shipSize, orientation);
        player.debugGrid('Placed ship');
        this.ui.setClearEnabled(true);

        if (player.nrShipsInYard === 0) {
            this.ui.setGamePhase('waitready', /*canClearBoard*/true);
        } else {
            this.ui.setGamePhase('deploy', /*canClearBoard*/true);
        }
    }

    playerAttack = this.playerAttack.bind(this);
    playerAttack(coords) {
        if (this.game.phase !== 'battle') return;

        const attacker = this.game.humanPlayer;
        const opponent = this.game.computerPlayer;

        if (attacker !== this.game.currentAttacker) return;

        //const result = this.game.attackOpponent(attacker, opponent, coords);
        attacker.rememberAttack(coords);
        const result = opponent.receiveAttack(coords);

        if (result) this.ui.showAttackResult(result);

        const gameWon = opponent.allShipsSunk();
        if (gameWon) {
            if (DEBUG.TURNS) console.log(`%cWinner: ${attacker.name}`, 'color:green');
            this.ui.setCurrentAttacker(null);
            this.setGamePhase('victory');
        } else {
            this.ui.setCurrentAttacker('player2');
            this.game.nextPlayer();
        }
    }

    aiAttack = this.aiAttack.bind(this);
    aiAttack(coords) {
        const attacker = this.game.computerPlayer;
        const opponent = this.game.humanPlayer;

        //const result = this.game.attackOpponent(attacker, opponent, coords);
        const result = opponent.receiveAttack(coords);
        this.ui.showReceivedAttack(result);

        const gameWon = opponent.allShipsSunk();
        if (gameWon) {
            if (DEBUG.TURNS) console.log(`%cWinner: ${attacker.name}`, 'color:green');
            this.ui.setCurrentAttacker(null);
            this.setGamePhase('defeat');
        } else {
            this.ui.setCurrentAttacker('player1');
            this.game.nextPlayer();
        }
    }


// DEBUG //////////////////////////////////////////////////////////////////////////////////////100:/

    onKeyDown(event) {
        switch (event.key) {
            case 'i': {
                document.body.classList.toggle('images');
                break;
            }
            case 'z': {
                document.body.classList.toggle('zoom');
                break;
            }
            case '1': {
                OPTIONS.PLAYER1_HUMAN = true;
                console.log('Player 1: Human, player 2: Computer');
                break;
            }
            case '2': {
                OPTIONS.PLAYER1_HUMAN = false;
                console.log('Player 1: Computer, player 2: Human');
                break;
            }
        }
    }

}

//EOF