import { GLTFLoader } from '../../../../jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

// ! RECUERDA TODA POSICION EN Z ESTA EN NEGATIVO
// ! RECUERDA QUE LA CAMARA MIRA HACIA EL EJE Z NEGATIVO

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.modelPath = './js/assets/models/luis copy 4.glb'; // Ruta al modelo del túnel
    this.tunnelLength = 0;
    this.loadedFirst = false; // Bandera para controlar la carga del primer túnel
        this.tunnelSections = []; // Array para almacenar secciones de túnel
    this.nextZPosition = 0; // Comenzamos desde 0 y generamos hacia atrás
    this.sectionInterval = 300; // Longitud de cada sección
    this.sectionsAhead = 3; // Secciones a mantener adelante del jugador
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
    await this.loadTunnelModel(); // Cargar modelo una vez
    this.generateInitialSections(); // Generar secciones iniciales
    this.animate();
  }

  setTarget(target) {
    this.target = target;
    this.player = target; // Asigna el objetivo al jugador
  }

  createStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const estrellas = 20000;

    const starVertices = [];
    for (let i = 0; i < estrellas; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }


  async loadTunnelModel() {
    const loader = new GLTFLoader();
    try {
      const glb = await loader.loadAsync(this.modelPath);
      this.tunnelTemplate = glb.scene.clone(); // Clonamos para reusar
      this.tunnelTemplate.position.set(0, 0, 0);
      this.tunnelTemplate.visible = false; // Ocultar plantilla
      this.scene.add(this.tunnelTemplate);
    } catch (error) {
      console.error('Error cargando modelo:', error);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.render();
  }

  generateInitialSections() {
    // Generar primeras 3 secciones
    for (let i = 0; i < 3; i++) {
      this.addTunnelSection(i * -this.sectionInterval);
    }
  }

  addTunnelSection(zPosition) {
    const newSection = this.tunnelTemplate.clone();
    newSection.position.z = zPosition;
    newSection.visible = true;
    this.scene.add(newSection);
    this.tunnelSections.push(newSection);
  }

  updateTunnels(playerZ) {
    // Eliminar secciones demasiado atrás (optimización)
    while (this.tunnelSections.length > 0 && 
           playerZ - this.tunnelSections[0].position.z < -this.sectionInterval * 2) {
      this.scene.remove(this.tunnelSections.shift());
    }

    // Generar nuevas secciones hacia adelante (eje Z negativo)
    while (this.nextZPosition > playerZ - this.sectionInterval * this.sectionsAhead) {
      this.addTunnelSection(this.nextZPosition);
      this.nextZPosition -= this.sectionInterval;
    }
  }

  render() {
    if (this.target) {
      const pos = this.target.position;
      this.camera.position.set(pos.x, pos.y + 1, pos.z + 3);
      const lookAt = new THREE.Vector3(pos.x, pos.y, pos.z - 10);
      this.camera.lookAt(lookAt);
      
      // Actualizar túneles basado en posición del jugador
      this.updateTunnels(pos.z);
    }
    this.renderer.render(this.scene, this.camera);
  }
}
