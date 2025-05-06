import * as THREE from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GRAVITY } from './constants.js';

export class Player {
    constructor(camera, worldOctree, scene) {
        this.camera = camera;
        this.worldOctree = worldOctree;
        this.scene = scene;
        this.camera.rotation.order = 'YXZ';

        // Configuración de altura
        this.colliderHeight = 0; // Altura del collider en metros
        this.modelYOffset = -0.3;  // Ajuste para posicionar el modelo en el suelo

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
        this.keyStates = {};
        this.mouseTime = 0;

        // Animaciones
        this.animationFiles = {
            idle: './animations/Idle.glb',
            walk: './animations/Walking.glb',
            run: './animations/Running.glb',
            jump: './animations/Jump.glb'
        };
        
        this.animationActions = {};
        this.currentAnimationAction = null;
        this.mixer = null;
        this.availableAnimations = [];

        // Configuración de cámara en tercera persona
        this.cameraOffset = new THREE.Vector3(0, 1.5, -2); // Posición relativa al jugador
        this.cameraLookAtHeight = 1; // Altura a la que mira la cámara
        this.cameraRotation = new THREE.Vector2(0, 0); // Rotación de cámara (x, y)

        // Modelo 3D
        this.model = null;
        
        this.initControls();
        this.loadModel();
    }

    async loadModel() {
        const loader = new GLTFLoader();
        
        try {
            // 1. Cargar el modelo principal
            const modelGltf = await loader.loadAsync('my-character.glb');
            this.model = modelGltf.scene;
            
            // Ajustar modelo
            this.model.position.y += this.modelYOffset;
            this.model.scale.set(0.5, 0.5, 0.5);
            this.model.castShadow = true;
            this.model.receiveShadow = true;

            // 2. Crear el mixer para animaciones
            this.mixer = new THREE.AnimationMixer(this.model);
            
            // 3. Cargar animaciones por separado
            await this.loadAnimations();
            
            // 4. Configurar animación inicial
            this.setAnimation('idle');
            
            this.scene.add(this.model);
        } catch (error) {
            console.error('Error loading model:', error);
            // Modelo de fallback
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
                    
                        // Tomar la primera animación del archivo
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

        // Configurar la nueva animación
        newAction.reset();
        newAction.setEffectiveWeight(1);
        newAction.play();
        
        // Transición desde la animación anterior
        if (this.currentAnimationAction) {
            this.currentAnimationAction.crossFadeTo(newAction, 0.1, true);
        }
        
        this.currentAnimationAction = newAction;
    }

    update(deltaTime) {
        // Actualizar física
        let damping = Math.exp(-4 * deltaTime) - 1;
        if (!this.playerOnFloor) {
            this.playerVelocity.y -= GRAVITY * deltaTime;
            damping *= 0.1;
        }

        this.playerVelocity.addScaledVector(this.playerVelocity, damping);
        const deltaPosition = this.playerVelocity.clone().multiplyScalar(deltaTime);
        this.playerCollider.translate(deltaPosition);

        this.handleCollisions();
        this.updateCamera(deltaTime);
        this.updateModel(deltaTime);
    }

    updateCamera(deltaTime) {
        // Calcular rotación de cámara
        const quaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
                THREE.MathUtils.clamp(this.cameraRotation.x, -Math.PI/3, Math.PI/3),
                this.cameraRotation.y,
                0,
                'YXZ'
            )
        );

        // Calcular posición de cámara
        const offset = this.cameraOffset.clone().applyQuaternion(quaternion);
        const targetPosition = this.playerCollider.end.clone().add(offset);
        this.camera.position.lerp(targetPosition, 0.1);

        // Calcular punto de mira
        const lookAt = this.playerCollider.end.clone();
        lookAt.y += this.cameraLookAtHeight;
        this.camera.lookAt(lookAt);

        // Actualizar dirección de movimiento relativa a la cámara
        this.camera.getWorldDirection(this.playerDirection);
        this.playerDirection.y = 0;
        this.playerDirection.normalize();
    }

    updateModel(deltaTime) {
        if (!this.model) return;

        // Posición del modelo
        this.model.position.copy(this.playerCollider.end);
        this.model.position.y += this.modelYOffset;

        // Rotación según dirección de movimiento
        if (this.playerVelocity.x !== 0 || this.playerVelocity.z !== 0) {
            this.model.rotation.y = Math.atan2(
                this.playerVelocity.x, 
                this.playerVelocity.z
            );
        }

        // Actualizar animaciones según estado
        if (this.mixer && this.availableAnimations.length > 0) {
            const speed = this.playerVelocity.length();
            
            let desiredAnimation;
            if (!this.playerOnFloor) {
                desiredAnimation = 'jump';
            } else if (speed > 5) {
                desiredAnimation = 'run';
                this.mixer.timeScale = speed / 5;
            } else if (speed > 0.1) {
                desiredAnimation = 'walk';
                this.mixer.timeScale = speed ;
            } else {
                desiredAnimation = 'idle';
                // this.mixer.timeScale = speed ;

            }
            
            if (this.availableAnimations.includes(desiredAnimation)) {
                this.setAnimation(desiredAnimation);
            }
            
            this.mixer.update(deltaTime);
        }
    }

    resetPosition() {
        // Resetear collider
        this.playerCollider.start.set(0, 0.35, 0);
        this.playerCollider.end.set(0, this.colliderHeight, 0);
        
        // Resetear modelo
        if (this.model) {
            this.model.position.copy(this.playerCollider.end);
            this.model.position.y += this.modelYOffset;
            this.model.rotation.set(0, 0, 0);
        }
        
        // Resetear cámara
        this.cameraRotation.set(0, 0);
        this.updateCamera(0);
    }

    initControls() {
        document.addEventListener('keydown', (event) => {
            this.keyStates[event.code] = true;
        });

        document.addEventListener('keyup', (event) => {
            this.keyStates[event.code] = false;
        });

        document.body.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === document.body) {
                this.cameraRotation.y -= event.movementX / 500;
                this.cameraRotation.x -= event.movementY / 500;
            }
        });

        document.addEventListener('mousedown', () => {
            this.mouseTime = performance.now();
        });

        document.addEventListener('mouseup', () => {
            if (document.pointerLockElement !== null && this.onBallThrow) {
                this.onBallThrow();
            }
        });
    }

    getForwardVector() {
        this.camera.getWorldDirection(this.playerDirection);
        this.playerDirection.y = 0;
        this.playerDirection.normalize();
        return this.playerDirection;
    }

    getSideVector() {
        this.camera.getWorldDirection(this.playerDirection);
        this.playerDirection.y = 0;
        this.playerDirection.normalize();
        this.playerDirection.cross(this.camera.up);
        return this.playerDirection;
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

    controls(deltaTime) {
        const speedDelta = deltaTime * (this.playerOnFloor ? 25 : 8);

        if (this.keyStates['KeyW']) {
            this.playerVelocity.add(this.getForwardVector().multiplyScalar(speedDelta));
        }
        if (this.keyStates['KeyS']) {
            this.playerVelocity.add(this.getForwardVector().multiplyScalar(-speedDelta));
        }
        if (this.keyStates['KeyA']) {
            this.playerVelocity.add(this.getSideVector().multiplyScalar(-speedDelta));
        }
        if (this.keyStates['KeyD']) {
            this.playerVelocity.add(this.getSideVector().multiplyScalar(speedDelta));
        }
        if (this.playerOnFloor && this.keyStates['Space']) {
            this.playerVelocity.y = 15;
        }
    }

    teleportIfOob() {
        if (this.camera.position.y <= -25) {
            this.resetPosition();
        }
    }
}