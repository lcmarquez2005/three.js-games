import * as THREE from 'three';

import { GLTFLoader } from '/examples/jsm/loaders/GLTFLoader.js';
import { Laser } from './Laser.js';


export class Enemy {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.model = null;
    this.lasers = [];
    this.shootCooldown = 2;
    this.timeSinceLastShot = 0;
  }

async loadModel() {
  const loader = new GLTFLoader();
  const glb = await loader.loadAsync('./js/assets/models/villano.glb');
  this.model = glb.scene;

  // Escalar al 80% del tamaño original
  this.model.scale.set(0.7, 0.7, 0.7);

  this.model.position.set(
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10,
    this.player.model.position.z - 30
  );

  this.scene.add(this.model);
}


  update(delta) {
    if (!this.model) return;

    this.model.position.z += delta * 5; // Avanza hacia el jugador

    this.timeSinceLastShot += delta;
    if (this.timeSinceLastShot >= this.shootCooldown) {
      this.shoot();
      this.timeSinceLastShot = 0;
    }

    this.lasers.forEach(l => l.update(delta));
  }

  shoot() {
    const direction = new THREE.Vector3().subVectors(this.player.model.position, this.model.position).normalize();
    const laser = new Laser(this.scene, this.model.position.clone(), direction, 0x00ff00);
    this.lasers.push(laser);
  }

  destroy() {
    this.scene.remove(this.model);
    this.model = null;
  }
}
