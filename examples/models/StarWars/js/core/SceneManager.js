import { GLTFLoader } from '/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.solidObjects = []; // ⬅️ Almacenará los objetos con colisión
  }

  async init() {
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    await this.loadScene();

    this.animate();
  }

  setTarget(target) {
    this.target = target;
  }

  async loadScene() {
    const loader = new GLTFLoader();
    const glb = await loader.loadAsync('./js/assets/models/luis copy 4.glb');
    console.log('Modelo cargado:', glb.scene);

    this.scene.add(glb.scene);

    // Detectar y guardar objetos sólidos
// Dentro de SceneManager.js (o donde estés gestionando los objetos)
glb.scene.traverse((child) => {
  if (child.isMesh) {
    child.geometry.computeBoundingBox(); // Esto asegura que tenga BoundingBox
    this.solidObjects.push(child);  // Agregar solo el objeto al arreglo de objetos sólidos
    
    // Añadir una BoxHelper para ver si está bien calculada la hitbox
    const box = new THREE.BoxHelper(child, 0x00ff00); // Visualiza la hitbox en verde
    this.scene.add(box);
  }
});



    // Cubo de prueba
    const testGeo = new THREE.BoxGeometry(1, 1, 1);
    const testMat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const testCube = new THREE.Mesh(testGeo, testMat);
    testCube.position.set(0, 0, 0);
    this.scene.add(testCube);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.render();
  }

  render() {
    if (this.target) {
      const pos = this.target.position;
      this.camera.position.set(pos.x, pos.y + 2, pos.z + 5);
      const lookAt = new THREE.Vector3(pos.x, pos.y, pos.z - 10);
      this.camera.lookAt(lookAt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
