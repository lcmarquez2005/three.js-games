import * as THREE from 'three';
import { GLTFLoader } from '/examples/jsm/loaders/GLTFLoader.js';
import { Laser } from './Laser.js';
import { Input } from '../core/Input.js';

export class Player {
  constructor(scene, input) {
    this.scene = scene;
    this.input = input;

    // Parámetros de la nave
    this.speed = 15;
    this.maxSpeed = 30;
    this.acceleration = 1;
    this.rollSpeed = 0.1;
    this.pitchSpeed = 0.1;
    this.yawSpeed = 0.08;
    this.bankingFactor = 0.3;

    this.model = null;
    this.currentSpeed = 0;
    
    // Sistema de disparo
    this.lasers = [];
    this.shootCooldown = 0.1;
    this.timeSinceLastShot = this.shootCooldown;
    this.laserConfig = {
      color: 0x00ff00,
      glowColor: 0x00ff00,
      speed: 80,
      maxDistance: 200,
      soundUrl: './js/assets/sounds/laser.mp3',
      size: 0.05,
      length: 1.5,
  reverseDirection: true 
    };

    // Límites del movimiento
    this.bounds = {
      minX: -4,
      maxX: 4,
      minY: 1,
      maxY: 15,
      minZ: -Infinity,
      maxZ: Infinity
    };

    // Sistema de partículas de motor
    this.engineParticles = null;
    this.createEngineParticles();
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const glb = await loader.loadAsync('./js/assets/models/main.glb');
    this.model = glb.scene;
    this.model.renderOrder = 0;

    this.model.position.set(0, 5, -2);
    this.model.rotation.y = Math.PI;
    this.scene.add(this.model);

    if (this.engineParticles) {
      this.engineParticles.position.set(0, 0, 2);
      this.model.add(this.engineParticles);
    }
  }

  createEngineParticles() {
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
      positions[i * 3 + 2] = Math.random() * 0.01;
      sizes[i] = 0.1 + Math.random() * 0.3;

      colors[i * 3] = 0.8 + Math.random() * 0.2;
      colors[i * 3 ] = 0.4 + Math.random() * 0.3;
      colors[i * 3 + 2] = Math.random() * 0.2;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true
    });

    this.engineParticles = new THREE.Points(particles, particleMaterial);
    this.engineParticles.renderOrder = 1;
  }

  shootLaser() {
    if (this.timeSinceLastShot < this.shootCooldown || !this.model) return;

    // Puntos de disparo ajustados para que salgan verticales
    const offsets = [
      new THREE.Vector3(-0.3, 0.2, 0),  // Ala izquierda
      new THREE.Vector3(0.3, 0.2, 0)    // Ala derecha
    ];

    // Dirección hacia adelante (eje Z negativo) y ligeramente hacia arriba
    const baseDirection = new THREE.Vector3(0, 0.2, -2).normalize();
    const direction = baseDirection.applyQuaternion(this.model.quaternion);

    offsets.forEach(offset => {
      const adjustedOffset = offset.applyQuaternion(this.model.quaternion);
      const spawnPosition = this.model.position.clone().add(adjustedOffset);
      
      this.lasers.push(new Laser(
        this.scene,
        spawnPosition,
        direction,
        this.laserConfig
      ));

    });

    this.timeSinceLastShot = 0;
  }

  update(delta) {
    if (!this.model) return;

    // Control de velocidad
    if (this.input.isKeyPressed('ArrowUp')) {
      this.currentSpeed = THREE.MathUtils.lerp(
        this.currentSpeed,
        this.maxSpeed,
        this.acceleration * delta
      );
    } else if (this.input.isKeyPressed('ArrowDown')) {
      this.currentSpeed = THREE.MathUtils.lerp(
        this.currentSpeed,
        this.maxSpeed * 0.1,
        this.acceleration * delta
      );
    } else {
      this.currentSpeed = THREE.MathUtils.lerp(
        this.currentSpeed,
        this.speed,
        this.acceleration * delta
      );
    }

    // Movimiento
    const forwardVector = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(this.model.quaternion)
      .multiplyScalar(this.currentSpeed * delta);

    const newPosition = this.model.position.clone().add(forwardVector);
    
    // Aplicar límites
    newPosition.x = THREE.MathUtils.clamp(
      newPosition.x,
      this.bounds.minX,
      this.bounds.maxX
    );
    newPosition.y = THREE.MathUtils.clamp(
      newPosition.y,
      this.bounds.minY,
      this.bounds.maxY
    );
    
    this.model.position.copy(newPosition);

    // Rotación
    const targetEuler = new THREE.Euler().setFromQuaternion(this.model.quaternion);

    // Alabeo (Q/E)
    if (this.input.isKeyPressed('ArrowLeft')) targetEuler.z += this.rollSpeed;
    if (this.input.isKeyPressed('ArrowRight')) targetEuler.z -= this.rollSpeed;

    // Cabeceo (W/S)
    if (this.input.isKeyPressed('KeyW')) targetEuler.x -= this.pitchSpeed;
    if (this.input.isKeyPressed('KeyS')) targetEuler.x += this.pitchSpeed;

    // Guiñada (A/D)
    if (this.input.isKeyPressed('KeyA')) {
      targetEuler.y += this.yawSpeed;
      targetEuler.z += this.yawSpeed * this.bankingFactor;
    }
    if (this.input.isKeyPressed('KeyD')) {
      targetEuler.y -= this.yawSpeed;
      targetEuler.z -= this.yawSpeed * this.bankingFactor;
    }

    // Suavizado de rotación
    const targetQuaternion = new THREE.Quaternion().setFromEuler(targetEuler);
    this.model.quaternion.slerp(targetQuaternion, 0.2);

    // Actualizar partículas del motor
    if (this.engineParticles) {
      const positions = this.engineParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] = -3 - Math.random() * 2 * (this.currentSpeed / this.maxSpeed);
      }
      this.engineParticles.material.opacity = this.currentSpeed < 1 ? 0.0 : 0.8;
      this.engineParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Sistema de disparo
    // Sistema de disparo - CORRECCIÓN DEL CLICK
    this.timeSinceLastShot += delta;
    if (this.input.mouseDown) {  // Acceder a la propiedad directamente
      this.shootLaser();
    }

    // Actualizar láseres
    this.lasers = this.lasers.filter(laser => {
      laser.update(delta);
      return !laser.isDestroyed;
    });
  }
}