import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { Input } from './Input.js';
import { Player } from '../entities/Player.js';
import { EnemyManager } from '../entities/EnemyManager.js';

export class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.backgroundMusic = new Audio('./js/assets/sounds/main-theme.mp3');
  }

  async init() {
        // Configurar música
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.5;
    
    // Iniciar música (nota: muchos navegadores requieren interacción del usuario)
    // document.addEventListener('click', () => {
      this.backgroundMusic.play().catch(e => console.log('No se pudo reproducir audio:', e));
    // }, { once: true });

    this.sceneManager = new SceneManager();
    await this.sceneManager.init();

    this.input = new Input();
    this.player = new Player(this.sceneManager.scene, this.input);
    await this.player.loadModel();
    this.sceneManager.setTarget(this.player.model);

    this.enemyManager = new EnemyManager(this.sceneManager.scene, this.player);

    this.animate();
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();

    // ✅ Corrección aquí:
    this.player.update(delta, this.sceneManager.solidObjects);

    this.enemyManager.update(delta);
    this.sceneManager.render();
  }
}
