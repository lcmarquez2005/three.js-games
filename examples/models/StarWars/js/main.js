import { Game } from './core/Game.js';
import * as THREE from 'three';


// Iniciar el juego cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});