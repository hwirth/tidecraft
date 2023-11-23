// enum.js
///////////////////////////////////////////////////////////////////////////////////////////////100:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
///////////////////////////////////////////////////////////////////////////////////////////////100:/

import { SETTINGS } from './configuration.js';

export function Enum(...keys) {
	const toInt    = (prev, key, index) => ({...prev, [key]: index});
	const toString = (prev, key) => ({...prev, [key]: key});
	const toDict   = (SETTINGS.ENUM_STORES_STRINGS) ? toString : toInt;
	const dict = keys.reduce(toDict, {});
	return new Proxy(dict, {
		get(_, key) {
			if (typeof dict[key] === 'undefined') {
				throw new Error(`Key "${key}" does not exist in enum`);
			}
			return dict[key];
		},
		set() {
			throw new Error('Cannot add key to enum after creation');
		},
	});
}

//EOF