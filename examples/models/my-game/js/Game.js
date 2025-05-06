import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { GameWorld } from './GameWorld.js';
import { Lighting } from './Lighting.js';
import { Player } from './Player.js';
import { BallManager } from './BallManager.js';
import { TargetManager } from './TargetManager.js';
import { STEPS_PER_FRAME } from './constants.js';

export class Game {
    constructor() {
        this.container = document.getElementById('container');
        this.initRenderer();
        this.initCamera();

        // Inicializar el mundo 3D
        this.gameWorld = new GameWorld();

        // Configurar iluminación
        this.lighting = new Lighting(this.gameWorld.scene);

        // Crear jugador
        this.player = new Player(
            this.camera,
            this.gameWorld.worldOctree,
            this.gameWorld.scene
        );

        // Inicializar el administrador de bolas
        this.ballManager = new BallManager(
            this.gameWorld.scene,
            this.gameWorld.worldOctree,
            this.player
        );

        // Configurar el callback para disparar bolas
        this.player.controls.onBallThrow = (mouseTime) => {
            this.ballManager.throwBall(mouseTime);
        };

        // Inicializar el administrador de blancos
        this.targetManager = new TargetManager(
            this.gameWorld.scene,
            this.gameWorld.worldOctree,
            this.ballManager
        );


        // Configurar UI de puntuación
        this.setupScoreUI();

        // Configuración de estadísticas y eventos
        this.stats = this.initStats();
        this.initEventListeners();

        // Cargar el mundo
        this.loadGameWorld();
    }

    setupScoreUI() {
        this.scoreElement = document.createElement('div');
        this.scoreElement.style.position = 'absolute';
        this.scoreElement.style.top = '60px';
        this.scoreElement.style.right = '20px';
        this.scoreElement.style.color = 'white';
        this.scoreElement.style.fontSize = '24px';
        this.scoreElement.style.fontFamily = 'Arial';
        this.scoreElement.style.textShadow = '2px 2px 4px black';
        document.body.appendChild(this.scoreElement);
    }

    async loadGameWorld() {
        try {
            await this.gameWorld.loadWorld();
            this.player.resetPosition();
            this.startAnimation();
        } catch (error) {
            console.error('Error loading game world:', error);
        }
    }

    startAnimation() {
        this.renderer.setAnimationLoop(() => this.animate());
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 2, -5);
    }

    initStats() {
        const stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        stats.domElement.style.left = '0px';
        this.container.appendChild(stats.domElement);
        return stats;
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());

        this.container.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                document.body.requestPointerLock();
                this.player.controls.mouseTime = performance.now();
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (event.button === 0 && document.pointerLockElement !== null) {
                this.ballManager.throwBall();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'c') {
                // Cambiar ángulo de cámara si implementas esta funcionalidad
                // this.player.cameraController.switchAngle();
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        const deltaTime = Math.min(0.05, this.gameWorld.clock.getDelta()) / STEPS_PER_FRAME;
    
        for (let i = 0; i < STEPS_PER_FRAME; i++) {
            // Actualizar controles y física del jugador
            this.player.controls.update(deltaTime);
            this.player.update(deltaTime);
            
            this.ballManager.updateSpheres(deltaTime);
            this.player.teleportIfOob();
            this.targetManager.checkAllCollisions();
        }
    
        this.renderer.render(this.gameWorld.scene, this.camera);
        this.stats.update();
        this.scoreElement.textContent = `Puntuación: ${this.targetManager.getScore()}`;
    }

    dispose() {
        window.removeEventListener('resize', this.onWindowResize);
        this.renderer.dispose();
        if (this.gameWorld) this.gameWorld.dispose();
        if (this.player) this.player.dispose();
    }
}