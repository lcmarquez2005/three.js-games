import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GRAVITY, ANIMATION_FILES } from './constants.js';
import { Controls } from './Controls.js';
import { PlayerCamera } from './Camera.js';

export class Player {
    constructor(camera, worldOctree, scene) {
        this.camera = camera;
        this.worldOctree = worldOctree;
        this.scene = scene;
        this.camera.rotation.order = 'YXZ';

        // Configuración de altura
        this.colliderHeight = 0;
        this.modelYOffset = -0.3;

        // Collider físico
        this.playerCollider = new Capsule(
            new THREE.Vector3(0, 0.35, 0),
            new THREE.Vector3(0, this.colliderHeight, 0),
            0.35
        );

        // Movimiento y estado
        this.playerVelocity = new THREE.Vector3();
        this.playerDirection = new THREE.Vector3();
        this.playerOnFloor = false;

        // Animaciones
        this.animationFiles = ANIMATION_FILES;
        
        this.animationActions = {};
        this.currentAnimationAction = null;
        this.mixer = null;
        this.availableAnimations = [];

        // Modelo 3D
        this.model = null;
        
        // Initialize modules
        this.controls = new Controls(this);
        this.cameraController = new PlayerCamera(this);
        this.controls = new Controls(this);
        
        this.loadModel();
    }

    async loadModel() {
        const loader = new GLTFLoader();
        
        try {
            const modelGltf = await loader.loadAsync('my-character.glb');
            this.model = modelGltf.scene;
            
            this.model.position.y += this.modelYOffset;
            this.model.scale.set(0.5, 0.5, 0.5);
            this.model.castShadow = true;
            this.model.receiveShadow = true;

            this.mixer = new THREE.AnimationMixer(this.model);
            await this.loadAnimations();
            this.setAnimation('idle');
            
            this.scene.add(this.model);
        } catch (error) {
            console.error('Error loading model:', error);
            const geometry = new THREE.CapsuleGeometry(0.35, 1, 4, 8);
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            this.model = new THREE.Mesh(geometry, material);
            this.scene.add(this.model);
        }
    }

    async loadAnimations() {
        const loader = new GLTFLoader();
        const animationPromises = [];
    
        for (const [name, url] of Object.entries(this.animationFiles)) {
            animationPromises.push(
                loader.loadAsync(url)
                    .then(gltf => {
                        if (!gltf.animations || gltf.animations.length === 0) {
                            console.warn(`GLB ${url} has no animations`);
                            return { name, success: false };
                        }
                    
                        const clip = gltf.animations[0];
                        const action = this.mixer.clipAction(clip);
                        this.animationActions[name] = action;
                        action.setEffectiveWeight(0);
                    
                        return { name, success: true };
                    })
                    .catch(error => {
                        console.error(`Error loading GLB animation "${name}":`, error);
                        return { name, success: false };
                    })
            );
        }
    
        const results = await Promise.all(animationPromises);
        this.availableAnimations = results
            .filter(result => result.success)
            .map(result => result.name);
    
        console.log('Animaciones disponibles:', this.availableAnimations);
    }

    setAnimation(name) {
        if (!this.availableAnimations.includes(name)) {
            console.warn(`Animation "${name}" is not available.`);
            return;
        }
    
        const newAction = this.animationActions[name];
        if (this.currentAnimationAction === newAction) return;

        newAction.reset();
        newAction.setEffectiveWeight(1);
        newAction.play();
        
        if (this.currentAnimationAction) {
            this.currentAnimationAction.crossFadeTo(newAction, 0.1, true);
        }
        
        this.currentAnimationAction = newAction;
    }

    update(deltaTime) {
        let damping = Math.exp(-4 * deltaTime) - 1;
        if (!this.playerOnFloor) {
            this.playerVelocity.y -= GRAVITY * deltaTime;
            damping *= 0.1;
        }

        this.playerVelocity.addScaledVector(this.playerVelocity, damping);
        const deltaPosition = this.playerVelocity.clone().multiplyScalar(deltaTime);
        this.playerCollider.translate(deltaPosition);

        this.handleCollisions();
        this.cameraController.update(deltaTime);
        this.updateModel(deltaTime);
    }

    updateModel(deltaTime) {
        if (!this.model) return;

        this.model.position.copy(this.playerCollider.end);
        this.model.position.y += this.modelYOffset;

        if (this.playerVelocity.x !== 0 || this.playerVelocity.z !== 0) {
            this.model.rotation.y = Math.atan2(
                this.playerVelocity.x, 
                this.playerVelocity.z
            );
        }

        if (this.mixer && this.availableAnimations.length > 0) {
            const speed = this.playerVelocity.length();
            
            let desiredAnimation;
            if (!this.playerOnFloor) {
                if (this.playerVelocity.y > 0) {
                    this.setAnimation('jump');
                    this.mixer.timeScale = speed / 5;
                }
            } else if (speed > 5) {
                desiredAnimation = 'run';
                this.mixer.timeScale = speed/5 ;
            } else if (speed > 0.1) {
                desiredAnimation = 'walk';
                this.mixer.timeScale = speed  ;
            } else {
                desiredAnimation = 'idle';
            }
            
            if (this.availableAnimations.includes(desiredAnimation)) {
                this.setAnimation(desiredAnimation);
            }
            
            this.mixer.update(deltaTime);
        }
    }

    resetPosition() {
        this.playerCollider.start.set(0, 0.35, 0);
        this.playerCollider.end.set(0, this.colliderHeight, 0);
        
        if (this.model) {
            this.model.position.copy(this.playerCollider.end);
            this.model.position.y += this.modelYOffset;
            this.model.rotation.set(0, 0, 0);
        }
        
        this.cameraController.reset();
    }

    handleCollisions() {
        const result = this.worldOctree.capsuleIntersect(this.playerCollider);
        this.playerOnFloor = false;

        if (result) {
            this.playerOnFloor = result.normal.y > 0;
            if (!this.playerOnFloor) {
                this.playerVelocity.addScaledVector(result.normal, -result.normal.dot(this.playerVelocity));
            }
            if (result.depth >= 1e-10) {
                this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
            }
        }
    }

    teleportIfOob() {
        if (this.camera.position.y <= -25) {
            this.resetPosition();
        }
    }
}