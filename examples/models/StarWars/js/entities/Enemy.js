import * as THREE from 'three';
import { GLTFLoader } from '/examples/jsm/loaders/GLTFLoader.js';
import { Laser } from './Laser.js';
import { EffectsManager } from '../core/EffectsManager.js';

export class Enemy {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.model = null;
    this.lasers = [];
    this.shootCooldown = 2;
    this.timeSinceLastShot = 0;
    this.maxDistanceFromPlayer = 100;
    this.effects = new EffectsManager(this.scene);

    // Definición del área de juego (basada en los valores de spawn)
    this.playArea = {
      x: { min: -5, max: 5 },
      y: { min: 5, max: 15 }
    };

    // Propiedades para movimiento lateral
    this.movementCooldown = 1; // Tiempo entre movimientos
    this.timeSinceLastMove = 0;
    this.movementProbability = 0.9; // 40% de probabilidad de moverse
    this.movementSpeed = 2; // Velocidad de movimiento lateral
    this.targetPosition = null; // Posición objetivo para movimiento suave
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const glb = await loader.loadAsync('./js/assets/models/villano.glb');
    this.model = glb.scene;
    this.model.scale.set(0.7, 0.7, 0.7);

    // Posición inicial dentro del área definida
    this.model.position.set(
      this.playArea.x.min + Math.random() * (this.playArea.x.max - this.playArea.x.min),
      this.playArea.y.min + Math.random() * (this.playArea.y.max - this.playArea.y.min),
      this.player.model.position.z - 60
    );

    this.model.lookAt(this.player.model.position);
    this.scene.add(this.model);

    // Inicializar posición objetivo con la posición actual
    this.targetPosition = this.model.position.clone();
  }

  update(delta) {
    if (!this.model) return;

    // Movimiento principal hacia el jugador (eje Z)
    this.model.position.z += delta * 5;

    // Verificar si el enemigo debe ser destruido
    const distanceToPlayer = this.model.position.distanceTo(this.player.model.position);
    const hasPassedPlayer = this.model.position.z > this.player.model.position.z;

    if (distanceToPlayer > this.maxDistanceFromPlayer || hasPassedPlayer) {
      this.destroyH();
      return;
    }

    // Actualizar temporizador de disparo
    this.timeSinceLastShot += delta;
    if (this.timeSinceLastShot >= this.shootCooldown) {
      this.shoot();
      this.timeSinceLastShot = 0;
    }

    // Actualizar temporizador de movimiento lateral
    this.timeSinceLastMove += delta;
    if (this.timeSinceLastMove >= this.movementCooldown) {
      this.tryRandomMovement();
      this.timeSinceLastMove = 0;
    }

    // Movimiento suave hacia la posición objetivo
    this.updateLateralMovement(delta);

    // Actualizar y limpiar láseres
    this.lasers.forEach(l => l.update(delta));
    this.lasers = this.lasers.filter(laser => !laser.shouldDestroy);
  }

  tryRandomMovement() {
    // Solo si no está ya en movimiento
    // if (!this.isMoving) {
    if (Math.random() < this.movementProbability) {
      this.calculateNewTargetPosition();
      this.isMoving = true;
    }
    // }
  }

  calculateNewTargetPosition() {
    const newPosition = this.model.position.clone();
    const possibleMoves = [];
    const minMoveDistance = 2; // Distancia mínima de movimiento
    const maxMoveDistance = 6; // Distancia máxima de movimiento

    // Calcular distancias máximas posibles en cada dirección
    const maxLeft = newPosition.x - this.playArea.x.min;
    const maxRight = this.playArea.x.max - newPosition.x;
    const maxUp = this.playArea.y.max - newPosition.y;
    const maxDown = newPosition.y - this.playArea.y.min;

    // Verificar movimientos posibles con distancias variables
    if (maxLeft >= minMoveDistance) {
      const moveDistance = Math.min(maxLeft, maxMoveDistance);
      possibleMoves.push({ direction: 'left', distance: moveDistance });
    }
    if (maxRight >= minMoveDistance) {
      const moveDistance = Math.min(maxRight, maxMoveDistance);
      possibleMoves.push({ direction: 'right', distance: moveDistance });
    }
    if (maxUp >= minMoveDistance) {
      const moveDistance = Math.min(maxUp, maxMoveDistance);
      possibleMoves.push({ direction: 'up', distance: moveDistance });
    }
    if (maxDown >= minMoveDistance) {
      const moveDistance = Math.min(maxDown, maxMoveDistance);
      possibleMoves.push({ direction: 'down', distance: moveDistance });
    }

    // Si hay movimientos posibles, seleccionar uno al azar
    if (possibleMoves.length > 0) {
      const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

      switch (randomMove.direction) {
        case 'left':
          newPosition.x -= randomMove.distance;
          break;
        case 'right':
          newPosition.x += randomMove.distance;
          break;
        case 'up':
          newPosition.y += randomMove.distance;
          break;
        case 'down':
          newPosition.y -= randomMove.distance;
          break;
      }

      this.targetPosition = newPosition;
    }
  }

  updateLateralMovement(delta) {
    if (this.targetPosition && this.isMoving) {
      const direction = new THREE.Vector3().subVectors(this.targetPosition, this.model.position).normalize();
      const moveStep = this.movementSpeed * delta;

      // Mover hacia el objetivo
      this.model.position.x += direction.x * moveStep;
      this.model.position.y += direction.y * moveStep;

      // Verificar si llegó al destino
      if (this.model.position.distanceTo(this.targetPosition) < 0.1) {
        this.model.position.copy(this.targetPosition);
        this.isMoving = false;
      }
    }
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

    this.lasers.forEach(laser => laser.destroy());
    this.lasers = [];
  }

  destroy() {
    if (this.model) {
      this.effects.createExplosion(this.model.position, {
        color: 0xff3300,
        particleCount: 150
      });
      this.destroyH();
    }
  }
}