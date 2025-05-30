import { Game } from './core/Game.js';
// import * as THREE from 'three';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/webxr/VRButton.js';


// En tu función de inicialización principal:
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.xr.enabled = true; // Habilitar WebXR
document.body.appendChild(VRButton.createButton(renderer)); // Añadir botón VR


// Iniciar el juego cuando el DOM esté listo
// document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
// });