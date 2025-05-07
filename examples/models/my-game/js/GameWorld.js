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
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.textureLoader = new THREE.TextureLoader();
        this.worldModel = null;

        this.initScene();

        this.initScene();
    }

    initScene() {
        this.scene.background = new THREE.Color(0x88ccee);
        this.scene.fog = new THREE.Fog(0x88ccee, 0, 50);
    }

    loadWorld() {
        const loader = new GLTFLoader().setPath('./../../models/gltf/');
        loader.load('collision-world.glb', (gltf) => {
            this.scene.add(gltf.scene);
            this.worldOctree.fromGraphNode(gltf.scene);

            const worldTexture = this.textureLoader.load('../../textures/minecraft/atlas.png', (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(0.01, 0.01);

                gltf.scene.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                        const material = new THREE.MeshStandardMaterial({
                            map: texture,
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