import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { InputManager } from './InputManager.js';
import { Player } from '../entities/Player.js';
import { EnemyManager } from '../entities/EnemyManager.js';

export class Game {
  constructor() {
    this.clock = new THREE.Clock();
  }

  async init() {
    this.sceneManager = new SceneManager();
    await this.sceneManager.init();

    this.input = new InputManager();
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
