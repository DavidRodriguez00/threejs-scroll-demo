import { Game } from './core/Game.js';

const canvas = document.querySelector('#bg');

const game = new Game(canvas);
game.start();