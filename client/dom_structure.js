// dom_structure.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

import { YOUTUBE_MUSIC_LINK } from './configuration.js';

function newElements(definitions) {
	const nonAttributes = ['tag', 'innerText', 'innerHTML', 'children'];
	return definitions.map( (definition)=>{
		const element = document.createElement(definition.tag);

		const attributes = ([key]) => !nonAttributes.includes(key);
		const setAttribute = ([key, value]) => element.setAttribute(key, value);
		Object.entries(definition).filter(attributes).forEach(setAttribute);

		if (definition.innerText) element.innerText = definition.innerText;
		if (definition.innerHTML) element.innerHTML = definition.innerHTML;
		if (definition.children) element.append(...definition.children);

		return element;
	});
}

function newYard(shipDefinitions) {
	const shipElements = shipDefinitions.reduce( (prev, shipDefinition)=>{
		const newSpan = () => newElements([{ tag: 'span' }])[0];
		const newShip = () => newElements([{
			tag: 'div', class:'vertical ship ' + shipDefinition.type,
			children: Array.from({ length: shipDefinition.size }).map(newSpan),
		}])[0];
		const newShips = Array.from({ length: shipDefinition.amount }).map(newShip);
		return [...prev, ...newShips];
	}, []);

	const listElements = shipElements.map( (shipElement)=>{
		return newElements([{ tag: 'li', children: [shipElement] }])[0];
	});

	return listElements;
}

function newGrid() {
	const newCell = (_, colNr) => newElements([{ tag: 'td', 'data-column': colNr }])[0];
	const newRow = (_, rowNr) => newElements([{
		tag: 'tr', 'data-row': rowNr,
		children: Array.from({ length: 10 }).map(newCell),
	}])[0];

	return Array.from({ length: 10 }).map(newRow);
}

export function createDOMStructure(shipDefinitions) {
	document.body.innerHTML = '';
	document.body.append( ...newElements([
		{ tag: 'h1', innerText: document.title },
		{ tag: 'a', innerText: 'Music', id: 'music_link', target: 'supreme_music', href: YOUTUBE_MUSIC_LINK },
		{ tag: 'div', class: 'board', children: newElements([
			{ tag: 'h2', innerText: 'Player' },
			{ tag: 'table', class: 'grid player', children: newGrid() },
			{ tag: 'h2', innerText: 'Opponent' },
			{ tag: 'table', class: 'grid opponent', children: newGrid() },
			{ tag: 'li', class: 'yard vertical', children: newYard(shipDefinitions) },
			{ tag: 'div', class: 'controls', children: newElements([
				{ tag: 'button', name: 'orientation', innerText: 'Orientation' },
				{ tag: 'button', name: 'clearboard', innerText: 'Clear Board' },
				{ tag: 'button', name: 'ready', innerText: 'Ready' },
				{ tag: 'button', name: 'newgame', innerText: 'New Game' },
			])},
		])},
	]));
}

//EOF