import * as THREE from 'three';
import { GLTFLoader } from '/examples/jsm/loaders/GLTFLoader.js';
import { Laser } from './Laser.js';
import { EffectsManager } from '../core/EffectsManager.js'; // Asegúrate de importar el gestor de efectos

export class Enemy {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.model = null;
    this.lasers = [];
    this.shootCooldown = 2;
    this.timeSinceLastShot = 0;
    this.maxDistanceFromPlayer = 100; // Distancia máxima antes de destruirse
    this.effects = new EffectsManager(this.scene);
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const glb = await loader.loadAsync('./js/assets/models/villano.glb');
    this.model = glb.scene;
    this.model.scale.set(0.7, 0.7, 0.7);

    const spawnRanges = {
      x: { min: -5, max: 5 },
      y: { min: 5, max: 15 },
      zOffset: -60
    };

    this.model.position.set(
      spawnRanges.x.min + Math.random() * (spawnRanges.x.max - spawnRanges.x.min),
      spawnRanges.y.min + Math.random() * (spawnRanges.y.max - spawnRanges.y.min),
      this.player.model.position.z + spawnRanges.zOffset
    );

    this.model.lookAt(this.player.model.position);
    this.scene.add(this.model);
  }

  update(delta) {
    if (!this.model) return;

    this.model.position.z += delta * 5; // Avanza hacia el jugador

    // Verificar si el enemigo debe ser destruido
    const distanceToPlayer = this.model.position.distanceTo(this.player.model.position);
    const hasPassedPlayer = this.model.position.z > this.player.model.position.z;
    
    if (distanceToPlayer > this.maxDistanceFromPlayer || hasPassedPlayer) {
      this.destroy();
      return; // Salir temprano ya que el enemigo fue destruido
    }

    this.timeSinceLastShot += delta;
    if (this.timeSinceLastShot >= this.shootCooldown) {
      this.shoot();
      this.timeSinceLastShot = 0;
    }

    // Actualizar y limpiar láseres
    this.lasers.forEach(l => l.update(delta));
    this.lasers = this.lasers.filter(laser => !laser.shouldDestroy);
  }

  shootDirected() {
    const direction = new THREE.Vector3().subVectors(this.player.model.position, this.model.position).normalize();
    const laser = new Laser(this.scene, this.model.position.clone(), direction, {
      color: 0xff0000,
      glowColor: 0xff0000,
      speed: 30,
      maxDistance: 200,
      soundUrl: './js/assets/sounds/laser.mp3',
      size: 0.05,
      length: 1.5,
      reverseDirection: false
    });
    this.lasers.push(laser);
  }

  shoot() {
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(this.model.quaternion);
    direction.normalize();

    const laser = new Laser(this.scene, this.model.position.clone(), direction, {
      color: 0xff0000,
      glowColor: 0xff0000,
      speed: 30,
      maxDistance: 200,
      soundUrl: './js/assets/sounds/laser.mp3',
      size: 0.05,
      length: 1.5,
      reverseDirection: false
    });
    this.lasers.push(laser);
  }

  destroyH() {
    if (this.model) {
      this.scene.remove(this.model);
      this.model = null;
    }
    
    // Destruir todos los láseres asociados
    this.lasers.forEach(laser => laser.destroy());
    this.lasers = [];
    
    // Opcional: puedes emitir un evento o notificar al juego que este enemigo fue destruido
  }
destroy() {
  if (this.model) {
    this.effects.createExplosion(this.model.position, {
      color: 0xff3300, // Personaliza el color
      particleCount: 150 // Menos partículas para mejor rendimiento
    });
    this.destroyH(); // Tu lógica original de destrucción
  }
}
}