import * as THREE from 'three';

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.audioLoader = new THREE.AudioLoader();
    this.sound = null;
    this.initSound();
  }

  async initSound() {
      this.sound = new Audio('./js/assets/sounds/explosion.mp3');
      this.sound.volume = 0.3;
      this.sound.play().catch(error => console.log("Audio error:", error));
  }

  createExplosion(position, options = {}) {
    // Configuración por defecto con opciones personalizables
    const config = {
      color: 0xff0000,
      particleCount: 200,
      size: 0.2,
      duration: 100, // en frames
      soundEnabled: true,
      ...options
    };

    // Sonido de explosión
    if (this.sound && config.soundEnabled) {
      this.sound = new Audio('./js/assets/sounds/explosion.mp3');

      this.sound.volume = 0.3;

      this.sound.play();

    }

    // Partículas
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(config.particleCount * 3);
    const colors = new Float32Array(config.particleCount * 3);

    for (let i = 0; i < config.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      colors[i * 3] = (config.color >> 16 & 255) / 255; // R
      colors[i * 3 + 1] = (config.color >> 8 & 255) / 255; // G
      colors[i * 3 + 2] = (config.color & 255) / 255; // B
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: config.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particles, particleMaterial);
    particleSystem.position.copy(position);
    this.scene.add(particleSystem);

    // Animación
    let frameCount = 0;
    const animate = () => {
      frameCount++;
      const progress = frameCount / config.duration;
      
      particleSystem.scale.setScalar(1 + progress * 2);
      particleMaterial.opacity = 0.8 * (1 - progress);
      
      if (frameCount < config.duration) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(particleSystem);
        particleMaterial.dispose();
        particles.dispose();
      }
    };

    animate();
  }
}