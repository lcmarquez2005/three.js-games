import * as THREE from 'three';
import { Octree } from 'three/addons/math/Octree.js';
import { OctreeHelper } from 'three/addons/helpers/OctreeHelper.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
export class GameWorld {
    constructor() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.worldOctree = new Octree();
        this.textureLoader = new THREE.TextureLoader();
        this.ground = null;
        this.worldModel = null;
        this.helper = null;
        this.debugMode = false;
        
        // Texturas
        this.groundTexture = null;
        this.wallTexture = null;
        
        this.initScene();
    }

    initScene() {
        this.scene.background = new THREE.Color(0x00aae4);
        this.scene.fog = new THREE.Fog(0xc5c6d0, 1, 30);
    }

    async loadTextures() {
        // Cargar texturas
        this.groundTexture = await this.textureLoader.loadAsync('../../textures/minecraft/atlas.png');
        this.wallTexture = await this.textureLoader.loadAsync('../../textures/minecraft/dirt.png');
        
        // Configurar texturas
        [this.groundTexture, this.wallTexture].forEach(texture => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(0.05, 0.05);
        });
    }

    async loadWorld() {
        await this.loadTextures();
        
        const loader = new GLTFLoader().setPath('./../../models/gltf/');
        loader.load('collision-world.glb', (gltf) => {
            this.scene.add(gltf.scene);
            this.worldOctree.fromGraphNode(gltf.scene);

            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Determinar qué textura usar basado en el nombre del objeto o su normal
                    let textureToUse = this.groundTexture;
                    
                    // Opción 1: Usar el nombre del objeto para decidir
                    // if (child.name.toLowerCase().includes('wall')) {
                    //     textureToUse = this.wallTexture;
                    // }
                    
                    // Opción 2: Usar la orientación (normales) para decidir
                    const normal = new THREE.Vector3();
                    child.geometry.computeVertexNormals();
                    if (child.geometry.attributes.normal) {
                        normal.fromBufferAttribute(child.geometry.attributes.normal, 0);
                        if (Math.abs(normal.y) < 0.5) { // Si no es principalmente vertical
                            textureToUse = this.wallTexture;
                        }
                    }
                    
                    const material = new THREE.MeshStandardMaterial({
                        map: textureToUse,
                        roughness: 0.7,
                        metalness: 0.1
                    });
                    child.material = material;

                    if (child.geometry.attributes.uv) {
                        const uvArray = child.geometry.attributes.uv.array;
                        for (let i = 0; i < uvArray.length; i++) {
                            uvArray[i] *= 5;
                        }
                        child.geometry.attributes.uv.needsUpdate = true;
                    }
                }
            });

            const helper = new OctreeHelper(this.worldOctree);
            helper.visible = false;
            this.scene.add(helper);

            const gui = new GUI({ width: 200 });
            gui.add({ debug: false }, 'debug').onChange((value) => {
                helper.visible = value;
            });
        });
    }
}