import * as THREE from 'three';
import { GLTFLoader } from '/examples/jsm/loaders/GLTFLoader.js';

export class Player {
  constructor(scene, input) {
    this.scene = scene;
    this.input = input;

    // Parámetros de la nave
    this.speed = 15; // Velocidad base
    this.maxSpeed = 30; // Velocidad máxima
    this.acceleration = 1; // Aceleración
    this.rollSpeed = 0.1; // Velocidad de alabeo (roll)
    this.pitchSpeed = 0.08; // Velocidad de cabeceo (pitch)
    this.yawSpeed = 0.05; // Velocidad de guiñada (yaw)
    this.bankingFactor = 0.3; // Inclinación al girar

    this.model = null;
    this.velocity = new THREE.Vector3();
    this.forwardVector = new THREE.Vector3(0, 0, -0);
    this.targetQuaternion = new THREE.Quaternion();
    this.currentSpeed = 0;

    this.bounds = {
      minX: -4,
      maxX: 4,
      minY: 1,
      maxY: 15,
      minZ: -Infinity,  // Podés dejarlo infinito si solo te interesa limitar en X e Y
      maxZ: Infinity
    };
    
    // Efectos de partículas para motores
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


    // Añadir las partículas de motor a la nave
    if (this.engineParticles) {
      this.engineParticles.position.set(0, 0, 2); // ← Ajusta si es necesario
      this.model.add(this.engineParticles);
    }

  }

  createEngineParticles() {
    const particleCount = 200;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.1;       // X (más fino)
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1;   // Y (más fino)
      positions[i * 3] = Math.random() * 0.01;             // Z (más largo)
      sizes[i] = 0.1 + Math.random() * 0.3;                 // Partículas más pequeñas



      colors[i * 3] = 0.8 + Math.random() * 0.2;
      colors[i * 3] = 0.4 + Math.random() * 0.3;
      colors[i * 3 + 2] = Math.random() * 0.2;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 1,
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



  update(delta, solidObjects = []) {
    if (!this.model) return;

    // Control de velocidad (aceleración/desaceleración)
    if (this.input.isKeyPressed('KeyW') || this.input.isKeyPressed('ArrowUp')) {
      this.currentSpeed = THREE.MathUtils.lerp(
        this.currentSpeed,
        this.maxSpeed,
        this.acceleration * delta
      );
    } else if (this.input.isKeyPressed('KeyS') || this.input.isKeyPressed('ArrowDown')) {
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

    // Movimiento basado en la orientación actual
    this.forwardVector.set(0, 0, 1).applyQuaternion(this.model.quaternion);

    const newPosition = this.model.position.clone().add(
      this.forwardVector.clone().multiplyScalar(this.currentSpeed * delta)
    );

    // Limitar posición dentro de los bounds
    newPosition.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, newPosition.x));
    newPosition.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, newPosition.y));
    newPosition.z = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, newPosition.z));

    // Aplicar solo si es válido
    this.model.position.copy(newPosition);


    // Controles de rotación (suavizados)
    const targetEuler = new THREE.Euler().setFromQuaternion(this.model.quaternion);

    // Alabeo (Roll - Q/E)
    if (this.input.isKeyPressed('KeyA')) {
      targetEuler.z += this.rollSpeed;
    }
    if (this.input.isKeyPressed('KeyD')) {
      targetEuler.z -= this.rollSpeed;
    }

    // Cabeceo (Pitch - Flechas arriba/abajo)
    if (this.input.isKeyPressed('ArrowUp')) {
      targetEuler.x -= this.pitchSpeed;
    }
    if (this.input.isKeyPressed('ArrowDown')) {
      targetEuler.x += this.pitchSpeed;
    }

    // Guiñada (Yaw - Flechas izquierda/derecha)
    if (this.input.isKeyPressed('ArrowLeft')) {
      targetEuler.y += this.yawSpeed;
      // Inclinación lateral al girar (efecto banking)
      targetEuler.z += this.yawSpeed * this.bankingFactor;
    }
    if (this.input.isKeyPressed('ArrowRight')) {
      targetEuler.y -= this.yawSpeed;
      // Inclinación lateral al girar (efecto banking)
      targetEuler.z -= this.yawSpeed * this.bankingFactor;
    }

    // Suavizar la rotación
    this.targetQuaternion.setFromEuler(targetEuler);
    this.model.quaternion.slerp(this.targetQuaternion, 0.2);

    // Actualizar partículas de motor
    if (this.engineParticles) {
      // this.engineParticles.rotation.copy(this.model.rotation);
      // Animación de partículas
      const positions = this.engineParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] = -3 - Math.random() * 2 * (this.currentSpeed / this.maxSpeed);
      }
      // Ajustar opacidad según la dirección del movimiento
      this.engineParticles.material.opacity = this.currentSpeed < 1 ? 0.0 : 0.8;

      this.engineParticles.geometry.attributes.position.needsUpdate = true;
    }
  }
}