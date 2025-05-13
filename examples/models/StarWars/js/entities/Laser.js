export class Laser {
  constructor(scene, position, direction = new THREE.Vector3(0, 0, -1), color = 0xff0000, speed = 20) {
    this.scene = scene;
    this.speed = speed;
    this.direction = direction.normalize();

    const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1);
    const material = new THREE.MeshBasicMaterial({ color });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.rotation.x = Math.PI / 2; // apuntar hacia adelante
    this.mesh.position.copy(position);

    scene.add(this.mesh);
  }

  update(delta) {
    this.mesh.position.addScaledVector(this.direction, this.speed * delta);

    // Opcional: remover si sale de los límites
    if (this.mesh.position.z < -100 || this.mesh.position.z > 100) {
      this.destroy();
    }
  }

  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.isDestroyed = true;
  }
}
