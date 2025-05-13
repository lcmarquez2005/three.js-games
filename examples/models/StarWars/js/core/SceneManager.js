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
    
  this.createStarfield();

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


  }
  
createStarfield() {
  // Crear geometría para las estrellas
  const starGeometry = new THREE.BufferGeometry();
  const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.8
  });
  const estrellas = 20000;

  // Generar posiciones aleatorias para las estrellas
  const starVertices = [];
  for (let i = 0; i < estrellas; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
  }

  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

  // Crear el sistema de partículas (estrellas)
  const stars = new THREE.Points(starGeometry, starMaterial);
  this.scene.add(stars);
}

  animate() {
    requestAnimationFrame(() => this.animate());
    this.render();
  }

  render() {
    if (this.target) {
      const pos = this.target.position;
      this.camera.position.set(pos.x, pos.y + 1, pos.z + 3);
      const lookAt = new THREE.Vector3(pos.x, pos.y, pos.z - 10);
      this.camera.lookAt(lookAt);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
