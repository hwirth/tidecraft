// configuration.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

import { Enum } from './enum.js';

const rootElement = getComputedStyle(document.documentElement);
const getCssVar = (name) => rootElement.getPropertyValue(name);
const getSecondsAsMillis = (name) => Math.floor(parseFloat(getCssVar(name)) * 1000);

export const PROGRAM_NAME = document.title;
export const PROGRAM_VERSION = '2.0.9b';

const DEV_SERVER = true && (location.hostname != 'harald.ist.org');

export const DEBUG = {
	REDUCED_NR_SHIPS : DEV_SERVER && !false,   // Reduce amount of ships
	QUICK_ATTACK     : DEV_SERVER && !false,   // AI responds without delay
	/* console.log()s: */
	INSTANCES        : DEV_SERVER && !false,
	SHIP_DEFINITION  : DEV_SERVER &&  false,
	GRIDS            : DEV_SERVER && !false,
	SHIPYARD         : DEV_SERVER &&  false,
	PLACE_SHIPS      : DEV_SERVER &&  false,
	GAME_PHASE       : DEV_SERVER && !false,
	TURNS            : DEV_SERVER && !false,
	ATTACKS          : DEV_SERVER &&  false,
};

export const SETTINGS = {
	BODY_FADE_TIME      : 250,
	ANIMATE_ATTACK_TIME : DEBUG.QUICK_ATTACK ? 0 : getSecondsAsMillis('--cell-marker-animation-time'),
	BACKGROUND_IMAGES   : true,
	FILL_SCREEN         : true,   // Use vmin based font size
	CALCULATE_FONT_SIZE : false,  // Don't rely on CSS vmin font size, attach onresize handler
	ZOOM_FONT_VMIN      : parseFloat(getCssVar('--vmin-font-size')),
};

export const SIGNALS = Enum(
	'RESET_GAME',
	'RESET_BOARD',
	'READY_TO_DEPLOY',
	'DEPLOY_SHIP',
	'START_PLACING',
	'WAIT_READY',
	'RESET_YARD',
	'PLAYER_READY',
	'SELECT_TARGET',
	'CLICK_TARGET',
	'TARGET_CHOSEN',
	'PERFORM_ATTACK',
	'RECEIVE_ATTACK',
	'SHOW_ATTACK',
	'ATTACK_SHOWN',
	'CHECK_DEFEAT',
	'STILL_ALIVE',
	'I_AM_DEAD',
	'YOU_LOSE',
	'YOU_WIN',
	'DISPLAY_DEFEAT',
	'DISPLAY_VICTORY',
);

export const OPTIONS = {
	ATTACK_CELL_TWICE : DEBUG.QUICK_ATTACK,
	AI_ATTACK_DELAY   : DEBUG.QUICK_ATTACK ? 0 : SETTINGS.ANIMATE_ATTACK_TIME*2,
	PLAYER1_HUMAN     : true,
};

const SHIP_DEFINITION_REDUCED = [
	{type:'carrier', amount: 1, size: 4},
	{type:'cruiser', amount: 1, size: 3},
	//{type:'submarine' , amount: 3, size: 1},
];
const SHIP_DEFINITION_FULL = [
	{type:'carrier'   , amount: 1, size: 4},
	{type:'cruiser'   , amount: 2, size: 3},
	{type:'destroyer' , amount: 3, size: 2},
	{type:'submarine' , amount: 4, size: 1},
];

export const SHIP_DEFINITION = DEBUG.REDUCED_NR_SHIPS ? SHIP_DEFINITION_REDUCED : SHIP_DEFINITION_FULL;

export const YOUTUBE_MUSIC_LINK = 'https://www.youtube.com/watch?v=hFpB1EjOBSE&list=PL32CA0E2B242C8D32';

//EOF