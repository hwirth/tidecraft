// configuration.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { Const, Enum } from './enum.js';

const rootElement = getComputedStyle(document.documentElement);
const getCssVar = (name) => rootElement.getPropertyValue(name);
const getSecondsAsMillis = (name) => Math.floor(parseFloat(getCssVar(name)) * 1000);
const queryParams = new URLSearchParams(window.location.search.slice(1));

export const PROGRAM_NAME = document.title;
export const PROGRAM_VERSION = '2.0.9b';

const DEV_SERVER = (location.hostname === '127.0.0.1');

export const DEBUG = {
	/* Options: */
	REDUCED_NR_SHIPS    : DEV_SERVER && !false,   // Reduce amount of ships
	QUICK_ATTACK        : DEV_SERVER && !false,   // AI responds without animation delay
	STOP_AFTER_MESSAGES :(DEV_SERVER &&  false) ? 50 : null,   // MessageBroker: Stop relaying after amount
	/* console.log()s: */
	UI                  : DEV_SERVER && !false,
	MESSAGES            : DEV_SERVER && !false,
	GRIDS               : DEV_SERVER && !false,
	CREATE_SHIPS        : DEV_SERVER &&  false,
	PLACE_SHIPS         : DEV_SERVER &&  false,
	GAME_PHASES         : DEV_SERVER &&  false,
	TURNS               : DEV_SERVER && !false,
	NETWORK             : DEV_SERVER && !false,
};

export const SETTINGS = {
	BODY_FADE_TIME      : 250,
	ANIMATE_ATTACK_TIME : DEBUG.QUICK_ATTACK ? 0 : getSecondsAsMillis('--cell-marker-animation-time'),
	COMPUTER_PLACE_TIME : 1000,
	BACKGROUND_IMAGES   : true,
	FILL_SCREEN         : true,   // Use vmin based font size
	CALCULATE_FONT_SIZE : false,  // Don't rely on CSS vmin font size, attach onresize handler
	ZOOM_FONT_VMIN      : parseFloat(getCssVar('--vmin-font-size')),
	GRID_SIZE           : 10,
	WEBSOCKET_URL       : 'wss://' + location.hostname + ':8888',
};

export const OPTIONS = {
	ATTACK_CELL_TWICE : DEBUG.QUICK_ATTACK,
	AI_ATTACK_DELAY   : DEBUG.QUICK_ATTACK ? 0 : SETTINGS.ANIMATE_ATTACK_TIME * 2 + 333,
	PLAYER1_HUMAN     : queryParams.get('playerNr') === '1' || !queryParams.get('playerNr'),
	REMOTE_OPPONENT   : queryParams.get('playerNr') !== null,
};

export const REQUESTS = Enum(
	'CHECK_NAME',
	'CHOOSE_NAME',
	'LIST_SESSIONS',
	'JOIN_SESSION',
	'LEAVE_SESSION',
);

export const SIGNALS = Enum(
	'UI_READY',
	'SHOW_SECTION',
	'SECTION_READY',
	// Menu
	'PLAYER_VS_COMPUTER',
	'PLAYER_VS_PLAYER',
	'CHECK_NAME',
	'CHOOSE_NAME',
	'NAME_AVAILABLE',
	'NAME_ACCEPTED',
	'NAME_REJECTED',
	// Game
	'RESET_GAME',
	'RESET_BOARD',
	'READY_TO_DEPLOY',
	'DEPLOY_SHIP',
	'START_PLACING',
	'PLACE_SHIP',
	'ACCEPT_DEPLOY',
	'REJECT_DEPLOY',
	'DEPLOY_DONE',
	'RESET_YARD',
	'WAIT_READY',
	'ENABLE_READY',
	'PLAYER_READY',
	'CURRENT_PLAYER',
	'SELECT_TARGET',
	'CLICK_TARGET',
	'TARGET_CHOSEN',
	'PERFORM_ATTACK',
	'RECEIVE_ATTACK',
	'ANNOUNCE_RESULT',
	'STILL_ALIVE',
	'I_AM_DEAD',
	'DISPLAY_DEFEAT',
	'DISPLAY_VICTORY',
);

export const PLAYER_TYPES = Enum(
	'HUMAN',
	'COMPUTER',
	'REMOTE',
);

export const ATTACK_RESULTS = Enum(
	'MISS',
	'HIT',
	'SUNK',
);

export const GAME_PHASES = Const({
	DEPLOY         : 'deploy',
	WAIT_READY     : 'waitready',
	OPPONENT_READY : 'opponentready',
	WAIT_OPPONENT  : 'waitopponent',
	BATTLE         : 'battle',
	DEFEAT         : 'defeat',
	VICTORY        : 'victory',
});

export const SHIP_DEFINITION = DEBUG.REDUCED_NR_SHIPS
	? [
		{type:'carrier', amount: 1, size: 4},
		{type:'cruiser', amount: 1, size: 3},
	]:[
		{type:'carrier'  , amount: 1, size: 4},
		{type:'cruiser'  , amount: 2, size: 3},
		{type:'destroyer', amount: 3, size: 2},
		{type:'submarine', amount: 4, size: 1},
	];

export const SOUND_DEFINITIONS = {
	[ATTACK_RESULTS.MISS] : { fileName: 'sounds/miss.mp3', volume: 0.1 },
	[ATTACK_RESULTS.HIT]  : { fileName: 'sounds/hit.mp3' , volume: 0.7 },
	[ATTACK_RESULTS.SUNK] : { fileName: 'sounds/sunk.mp3', volume: 1 },
};

export const RANDOM_TITLES = [
	'Admiral', 'Rear Admiral', 'Vice Admiral', 'Commander', 'Captain', 'Commodore',
];

export const RANDOM_NAMES = [
	'Anchorsplash', 'Aquajester',
	'Bellysplash', 'Broadergrin', 'Bubbleburp', 'Barnacle',
	'Chuckler', 'Chuckleweaver', 'Crestcackler',
	'Dewdrop', 'Driftrider',
	'Gigglesurge', 'Grinner', 'Goldfisher',
	'Hillarion', 'Harbordweller',
	'Inkwell', 'Icebergh', 'Crestbuster',
	'Kelpmuncher', 'Keelbreaker',
	'Laughsmith', 'Listing',
	'Nebulol', 'Neptoon',
	'Overbeard',
	'Punsolo', 'Phundroplet', 'Paddlefast',
	'Rippletide', 'Roguewaver', 'Rumblesplash',
	'Snickernaut', 'Saltygrin',
	'Tideturner', 'Tritontickler',
	'Vortexverve',
	'Waverider', 'Waketrotter',
	'Yonderwalt', 'Yachtsitter', 'Yuletide',
];

export const YOUTUBE_MUSIC_LINK = 'https://www.youtube.com/watch?v=hFpB1EjOBSE&list=PL32CA0E2B242C8D32';

//EOF