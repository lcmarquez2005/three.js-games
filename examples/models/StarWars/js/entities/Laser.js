import * as THREE from 'three';

export class Laser {
  constructor(scene, startPosition, direction, options = {}) {
    this.scene = scene;
    // Añadir opción para invertir dirección
    this.reverseDirection = options.reverseDirection || false;
    
    // Invertir dirección si es necesario
    this.direction = this.reverseDirection 
      ? direction.clone().normalize().negate() 
      : direction.normalize();
    
    this.speed = options.speed || 60;
    this.maxDistance = options.maxDistance || 200;
    this.distanceTraveled = 0;
    this.isDestroyed = false;

    // Configuración por defecto
    const config = {
      color: 0x00ff00,
      glowColor: 0x00ff00,
      size: 0.1,
      length: 2,
      soundUrl: null,
      ...options
    };

    // Geometría principal del láser
    this.geometry = new THREE.CylinderGeometry(
      config.size, 
      config.size, 
      config.length, 
      8
    );
    
    this.material = new THREE.MeshPhongMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: 2,
      transparent: true,
      opacity: 0.8
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(startPosition);
    this.mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1), 
      this.direction
    );

    // Efecto de glow
    const glowGeometry = new THREE.SphereGeometry(config.size * 2, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: config.glowColor,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    // Posicionar el glow según la dirección
    const glowOffset = this.reverseDirection ? -config.length / 2 : config.length / 2;
    this.glow.position.set(0, 0, glowOffset);
    this.mesh.add(this.glow);

    // Sonido
    if (config.soundUrl) {
      this.sound = new Audio(config.soundUrl);
      this.sound.volume = 0.3;
      this.sound.play().catch(error => console.log("Audio error:", error));
    }

    this.scene.add(this.mesh);
  }

  update(delta) {
    if (this.isDestroyed) return;

    const distance = this.speed * delta;
    this.mesh.position.add(this.direction.clone().multiplyScalar(distance));
    this.distanceTraveled += distance;

    if (this.distanceTraveled >= this.maxDistance) {
      this.destroy();
    }
  }

  destroy() {
    if (this.isDestroyed) return;
    
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    this.material.dispose();
    this.isDestroyed = true;
  }
}