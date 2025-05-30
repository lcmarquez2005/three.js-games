// import * as THREE from 'three';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/webxr/VRButton.js';
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
    // Música
    this.backgroundMusic.loop = true;
    this.backgroundMusic.volume = 0.5;
    this.backgroundMusic.play().catch(e => console.log('No se pudo reproducir audio:', e));

    // Escena
    this.sceneManager = new SceneManager();
    await this.sceneManager.init();

    // Habilitar VR
    this.sceneManager.renderer.xr.enabled = true;
    document.body.appendChild(VRButton.createButton(this.sceneManager.renderer));

    // Input y entidades
    this.input = new Input();
    this.player = new Player(this.sceneManager.scene, this.input);
    await this.player.loadModel();
    this.sceneManager.setTarget(this.player.model);

    this.enemyManager = new EnemyManager(this.sceneManager.scene, this.player);

    // Loop compatible con VR
    this.sceneManager.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta();
      this.player.update(delta, this.sceneManager.solidObjects);
      this.enemyManager.update(delta);
      this.sceneManager.render();
    });
  }
}
