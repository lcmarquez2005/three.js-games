import * as THREE from 'three';
import { GLTFLoader } from '/examples/jsm/loaders/GLTFLoader.js';

export class Player {
  constructor(scene, input) {
    this.scene = scene;
    this.input = input;
    this.speed = 5;
    this.model = null;
    this.velocity = new THREE.Vector3();
  }

  async loadModel() {
    const loader = new GLTFLoader();
    const glb = await loader.loadAsync('./js/assets/models/main.glb');
    this.model = glb.scene;

    this.model.position.set(0, 5, 0);
    this.model.rotation.y = Math.PI;

    this.scene.add(this.model);
  }

  update(delta, solidObjects = []) {
    if (!this.model) return;

    const move = new THREE.Vector3();

    // Movimiento manual con las teclas (W, A, S, D)
    if (this.input.isKeyPressed('KeyW')) move.z -= 1;
    if (this.input.isKeyPressed('KeyS')) move.z += 1;
    if (this.input.isKeyPressed('KeyA')) move.x -= 1;
    if (this.input.isKeyPressed('KeyD')) move.x += 1;

    // Normalizar el movimiento para evitar velocidad diagonal más alta
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(this.speed * delta);
    }

    // Movimiento automático hacia adelante (Z negativo)
    const autoForward = new THREE.Vector3(0, 0, -1).multiplyScalar(this.speed * delta);

    // Combinar ambos movimientos (manual y automático)
    move.add(autoForward);
    this.model.position.z -= delta * 5; // Avanza hacia el jugador


    // Evaluar colisiones por cada eje
    const tryMove = (axis) => {
      const original = this.model.position[axis];
      this.model.position[axis] += move[axis];

      const playerBox = new THREE.Box3().setFromObject(this.model);
      for (const obj of solidObjects) {
        const objBox = new THREE.Box3().setFromObject(obj);
        if (playerBox.intersectsBox(objBox)) {
          this.model.position[axis] = original; // Revertir si hay colisión
          return;
        }
      }
    };

    // Intentar mover por cada eje
    tryMove('x');
    tryMove('y');
    tryMove('z');
  }
}
