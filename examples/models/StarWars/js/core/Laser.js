// Laser.js
import * as THREE from 'three';

export class Laser {
  constructor(position, direction, speed = 1) {
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 }); // Rojo como láser imperial
    this.mesh = new THREE.Mesh(geometry, material);

    // Alinear el cilindro en la dirección del disparo
    this.mesh.rotation.x = Math.PI / 2;

    // Posicionar el láser
    this.mesh.position.copy(position);
    this.direction = direction.clone().normalize();
    this.speed = speed;
  }

  update(delta) {
    const movement = this.direction.clone().multiplyScalar(this.speed * delta);
    this.mesh.position.add(movement);
  }
}
