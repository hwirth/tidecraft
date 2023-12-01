
// sounds.js
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/
// Battleships - copy(l)eft 2023 - https://harald.ist.org/
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////119:/

import { SOUND_DEFINITIONS } from './configuration.js';

export class Sounds {
	#sounds = {};

	constructor() {
		const soundsLoaded = Object.entries(SOUND_DEFINITIONS).map(([key, definition]) => {
			return new Promise((done) => {
				const sound = new Audio(definition.fileName);
				sound.volume = definition.volume;
				sound.addEventListener('canplaythrough', done);
				this.#sounds[key] = sound;
			});
		});

		Promise.all(soundsLoaded);
	}

	play = (key) => {
		const sound = this.#sounds[key];

		sound.pause();
		sound.currentTime = 0;
		sound.play();
	};
}

//EOF