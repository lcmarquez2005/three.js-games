import { GLTFLoader } from '../../../../jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();

    // Cámara normal
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );

    // Crear un grupo para VR
    this.vrGroup = new THREE.Group();
    this.scene.add(this.vrGroup);

    // Poner la cámara dentro del grupo VR
    this.vrGroup.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true; // Habilitar XR
    document.body.appendChild(this.renderer.domElement);

    this.modelPath = './js/assets/models/luis copy 4.glb';
    this.tunnelLength = 0;
    this.loadedFirst = false;
    this.tunnelSections = [];
    this.nextZPosition = 0;
    this.sectionInterval = 300;
    this.sectionsAhead = 3;
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
    await this.loadTunnelModel();
    this.generateInitialSections();

    // Botón VR
    document.body.appendChild(VRButton.createButton(this.renderer));

    this.animate();
  }

  setTarget(target) {
    this.target = target;
    this.player = target;
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
      this.tunnelTemplate = glb.scene.clone();
      this.tunnelTemplate.position.set(0, 0, 0);
      this.tunnelTemplate.visible = false;
      this.scene.add(this.tunnelTemplate);
    } catch (error) {
      console.error('Error cargando modelo:', error);
    }
  }

  animate() {
    this.renderer.setAnimationLoop(() => this.render());
  }

  generateInitialSections() {
    for (let i = 0; i < 3; i++) {
      this.addTunnelSection(i * -this.sectionInterval);
    }
    this.nextZPosition = -this.sectionInterval * 3;
  }

  addTunnelSection(zPosition) {
    const newSection = this.tunnelTemplate.clone();
    newSection.position.z = zPosition;
    newSection.visible = true;
    this.scene.add(newSection);
    this.tunnelSections.push(newSection);
  }

  updateTunnels(playerZ) {
    while (
      this.tunnelSections.length > 0 &&
      playerZ - this.tunnelSections[0].position.z < -this.sectionInterval * 2
    ) {
      this.scene.remove(this.tunnelSections.shift());
    }

    while (this.nextZPosition > playerZ - this.sectionInterval * this.sectionsAhead) {
      this.addTunnelSection(this.nextZPosition);
      this.nextZPosition -= this.sectionInterval;
    }
  }

  render() {
    if (this.target) {
      const pos = this.target.position;

      if (!this.renderer.xr.isPresenting) {
        // Cámara normal sigue al jugador
        this.camera.position.set(pos.x, pos.y + 1, pos.z + 3);
        const lookAt = new THREE.Vector3(pos.x, pos.y, pos.z - 10);
        this.camera.lookAt(lookAt);
      } else {
        // En VR, mueve el grupo que contiene la cámara
        this.vrGroup.position.set(pos.x, pos.y, pos.z);
      }

      this.updateTunnels(pos.z);
    }

    this.renderer.render(this.scene, this.camera);
  }
}
