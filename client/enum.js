// enum.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { SETTINGS } from './configuration.js';

export function Const(entries) {
	return new Proxy(entries, {
		get(_, key) {
			if (typeof entries[key] === 'undefined') {
				throw new Error(`Key "${key}" does not exist in Const`);
			}
			return entries[key];
		},
		set() {
			throw new Error('Cannot add key to Const after creation');
		},
	});
}

export function Enum(...keys) {
	const toInt    = (prev, key, index) => ({...prev, [key]: index});
	const toString = (prev, key) => ({...prev, [key]: key});
	const toDict   = (SETTINGS.ENUM_STORES_STRINGS) ? toString : toInt;
	const dict = keys.reduce(toDict, {});
	return new Proxy(dict, {
		get(_, key) {
			if (typeof dict[key] === 'undefined') {
				throw new Error(`Key "${key}" does not exist in Enum`);
			}
			return dict[key];
		},
		set() {
			throw new Error('Cannot add key to Enum after creation');
		},
	});
}

//EOF