import * as THREE from 'three';
import { GLTFLoader } from '../../../../jsm/loaders/GLTFLoader.js';
import { EffectsManager } from '../core/EffectsManager.js';

import { Laser } from './Laser.js';
import {
  createEngineParticles,
  updateEngineParticles,
  updateHUD
} from './PlayerUtils.js';
// import { 
//     shootLaser, 
//     takeDamage, 
//     addScore, 
//     gameOver 
// } from './PlayerActions.js';

export class Player {
  constructor(scene, input) {
    this.scene = scene;
    this.input = input;
    this.rederer = null;

    // Parámetros de la nave
    this.speed = 15;
    this.maxSpeed = 30;
    this.acceleration = 1;
    this.rollSpeed = 0.1;
    this.pitchSpeed = 0.1;
    this.yawSpeed = 0.08;
    this.bankingFactor = 0.3;
    this.effects = new EffectsManager(this.scene);

    this.model = null;
    this.currentSpeed = 0;

    // Sistema de vidas y puntaje
    this.lives = 3;
    this.score = 0;
    this.isInvulnerable = false;
    this.invulnerabilityDuration = 1.5;
    this.invulnerabilityTimer = 0;

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
    // Nuevas propiedades para seguimiento de pinch
    this.lastPinchTime = 0;
    this.pinchCooldown = 300; // ms entre detecciones de pinch
    this.pinchHand = 'none';  // 'left', 'right' o 'none'
    this.controllers = null
    // Bandera para debug
    this.debugPinch = true;
    // Sistema de partículas de motor
    this.engineParticles = createEngineParticles();
  }

  // Método para asignar los controladores
  setControllers(controllers) {
    this.controllers = controllers;
  }

  // Método para verificar si se está presionando el gatillo

isTriggerPressed() {
    // Verificar primero si tenemos acceso a los controladores XR
    if (!this.controllers || !this.scene || !this.scene.renderer || !this.scene.renderer.xr) {
        return false;
    }

    const session = this.scene.renderer.xr.getSession();
    if (!session) return false;

    // Verificar ambos controladores
    for (const controller of this.controllers) {
        // Verificar si el controlador tiene gamepad
        if (controller?.inputSource?.gamepad?.buttons?.[0]?.pressed) {
            return true;
        }
    }
    return false;
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

update(delta) {
    if (!this.model) return;
    
    updateHUD(this.lives, this.score);
    this.handleInvulnerability(delta);
    this.updateSpeed(delta);
    this.updatePosition(delta);
    this.updateRotation();
    updateEngineParticles(this.engineParticles, this.currentSpeed, this.maxSpeed);
    this.handleShooting(delta);
    this.updateLasers(delta);
}

  // ↓↓↓ FUNCIONES AUXILIARES ↓↓↓

  canShoot(delta) {
    if (this.timeSinceLastShot < this.shootCooldown) {
      this.timeSinceLastShot += delta;
      return false;
    }
    return true;
  }

  handleInvulnerability(delta) {
    if (this.isInvulnerable) {
      this.invulnerabilityTimer += delta;
      if (this.invulnerabilityTimer >= this.invulnerabilityDuration) {
        this.isInvulnerable = false;
      }
    }
  }

  updateSpeed(delta) {
    const accel = this.acceleration * delta;
    if (this.input.isKeyPressed('ShiftLeft')) {
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, this.maxSpeed, accel);
    } else if (this.input.isKeyPressed('ControlLeft')) {
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, this.maxSpeed * 0.1, accel);
    } else {
      this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, this.speed, accel);
    }
  }

  updatePosition(delta) {
    const forward = new THREE.Vector3(0, 0, 1)
      .applyQuaternion(this.model.quaternion)
      .multiplyScalar(this.currentSpeed * delta);

    const newPos = this.model.position.clone().add(forward);
    newPos.x = THREE.MathUtils.clamp(newPos.x, this.bounds.minX, this.bounds.maxX);
    newPos.y = THREE.MathUtils.clamp(newPos.y, this.bounds.minY, this.bounds.maxY);
    this.model.position.copy(newPos);
  }

  updateRotation() {
    const euler = new THREE.Euler().setFromQuaternion(this.model.quaternion);

    if (this.input.isKeyPressed('KeyE')) euler.z += this.rollSpeed;
    if (this.input.isKeyPressed('KeyQ')) euler.z -= this.rollSpeed;
    if (this.input.isKeyPressed('KeyW')) euler.x -= this.pitchSpeed;
    if (this.input.isKeyPressed('KeyS')) euler.x += this.pitchSpeed;
    if (this.input.isKeyPressed('KeyA')) {
      euler.y += this.yawSpeed;
      euler.z += this.yawSpeed * this.bankingFactor;
    }
    if (this.input.isKeyPressed('KeyD')) {
      euler.y -= this.yawSpeed;
      euler.z -= this.yawSpeed * this.bankingFactor;
    }

    const targetQuat = new THREE.Quaternion().setFromEuler(euler);
    this.model.quaternion.slerp(targetQuat, 0.2);
  }

  // Método simplificado para manejar disparos

  handleShooting(delta) {
    this.timeSinceLastShot += delta;
    
    if (this.timeSinceLastShot < this.shootCooldown) return;
    
    // Verificar si hay input de disparo
    if (this.input.isShooting()) {
      this.createLasers();
      this.timeSinceLastShot = 0;
    }
  }

  createLasers() {
    if (!this.model) return;

    // Configuración de los láseres
    const offsets = [
      new THREE.Vector3(-0.3, 0.2, 0),  // Ala izquierda
      new THREE.Vector3(0.3, 0.2, 0)    // Ala derecha
    ];

    // Dirección base de los disparos
    const baseDirection = new THREE.Vector3(0, 0.2, -2).normalize();
    const direction = baseDirection.applyQuaternion(this.model.quaternion);

    // Crear un láser por cada punto de disparo
    offsets.forEach(offset => {
      const adjustedOffset = offset.applyQuaternion(this.model.quaternion);
      const spawnPosition = this.model.position.clone().add(adjustedOffset);
      
      // Instanciar el láser
      const laser = new Laser(
        this.scene,
        spawnPosition,
        direction,
        this.laserConfig
      );
      
      this.lasers.push(laser);
    });
  }


  updateLasers(delta) {
    this.lasers = this.lasers.filter(laser => {
      laser.update(delta);
      return !laser.isDestroyed;
    });
  }




  // acciones

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
      colors[i * 3] = 0.4 + Math.random() * 0.3;
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
  takeDamage() {
    if (this.isInvulnerable) return;

    this.lives--;
    this.isInvulnerable = true;
    this.invulnerabilityTimer = 0;

    // Efecto visual de daño (parpadeo)

    this.effects.createExplosion(this.model.position, {
      color: 0xff3300,
      particleCount: 150
    });


    // Notificación con SWAL2
    Swal.fire({
      title: '¡Impacto!',
      text: `Has perdido una vida. Te quedan ${this.lives} vidas.`,
      icon: 'error',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      background: '#1a1a2e',
      color: '#ffffff',
      iconColor: '#ff4d4d'
    });

    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  addScore(points = 1) {
    this.score += points;

    // Notificación con SWAL2
    Swal.fire({
      title: '¡Punto!',
      text: `+${points} punto(s). Total: ${this.score}`,
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 1500,
      timerProgressBar: true,
      background: '#1a1a2e',
      color: '#ffffff',
      iconColor: '#4ade80'
    });
  }

  gameOver() {
    this.sound = new Audio('./js/assets/sounds/explosion.mp3');

    this.sound.volume = 0.9;

    this.sound.play();
    // Pantalla de Game Over con opciones
    Swal.fire({
      title: '¡Juego Terminado!',
      html: `<h2 style="color: #f8f8f8">Puntaje final: ${this.score}</h2>`,
      icon: 'error',
      background: '#1a1a2e',
      color: '#ffffff',
      confirmButtonText: 'Volver a Jugar?',
      confirmButtonColor: '#3085d6',
      showCancelButton: true,
      cancelButtonText: 'Salir',
      cancelButtonColor: '#d33',
      backdrop: `
      rgba(0,0,0,0.8)
      url("https://i.gifer.com/7VE.gif")
      center top
      no-repeat
    `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: true,
      focusConfirm: true
    }).then((result) => {
      if (result.isConfirmed) {
        // Recargar la página para reiniciar
        window.location.reload();
      } else {
        // Cerrar la pestaña (funciona en la mayoría de navegadores)
        window.close();

        // Alternativa si window.close() no funciona
        setTimeout(() => {
          window.location.href = "about:blank";
        }, 500);
      }
    });

    // Detener el juego (depende de tu implementación)
    if (typeof gameLoop !== 'undefined') {
      cancelAnimationFrame(gameLoop);
    }
  }

}