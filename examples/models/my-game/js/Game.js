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
                    // Cargar el mundo (versión asíncrona)
                    await this.gameWorld.loadWorld();

                    // Posicionar al jugador después de cargar el mundo
                    this.player.resetPosition();

                    // Iniciar animación
                    this.startAnimation();
                } catch (error) {
                    console.error('Error loading game world:', error);
                    // Mostrar mensaje de error al usuario si es necesario
                }
            }

            startAnimation() {
                // Separar la animación para mayor control
                this.renderer.setAnimationLoop(() => this.animate());
            }

            initRenderer() {
                this.renderer = new THREE.WebGLRenderer({
                    antialias: true
                });
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.setSize(window.innerWidth, window.innerHeight);

                // No iniciamos el animation loop aquí todavía
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.VSMShadowMap;
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.container.appendChild(this.renderer.domElement);
            }


            initRenderer() {
                this.renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true  // Permitir fondo transparente si es necesario
                });
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setAnimationLoop(() => this.animate());
                this.renderer.shadowMap.enabled = true;
                this.renderer.shadowMap.type = THREE.VSMShadowMap;
                this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
                this.renderer.outputEncoding = THREE.sRGBEncoding;  // Mejor manejo de colores
                this.container.appendChild(this.renderer.domElement);
            }

            initCamera() {
                // Configuración de cámara en tercera persona
                this.camera = new THREE.PerspectiveCamera(
                    75,  // Campo de visión más amplio para tercera persona
                    window.innerWidth / window.innerHeight,
                    0.1,
                    1000
                );

                // Posición inicial será ajustada por el jugador
                this.camera.position.set(0, 2, -5);
            }

            initStats() {
                const stats = new Stats();
                stats.domElement.style.position = 'absolute';
                stats.domElement.style.top = '0px';
                stats.domElement.style.left = '0px';  // Asegurar que no cubra controles
                this.container.appendChild(stats.domElement);
                return stats;
            }

            initEventListeners() {
                // Manejo de redimensionamiento
                window.addEventListener('resize', () => this.onWindowResize());

                // Control de ratón para tercera persona
                this.container.addEventListener('mousedown', (event) => {
                    // Solo capturar el ratón con clic izquierdo
                    if (event.button === 0) {
                        document.body.requestPointerLock();
                        this.player.mouseTime = performance.now();
                    }
                });

                // Disparar bolas
                document.addEventListener('mouseup', (event) => {
                    if (event.button === 0 && document.pointerLockElement !== null) {
                        this.ballManager.throwBall();
                    }
                });

                // Teclado para mover la cámara (opcional)
                document.addEventListener('keydown', (event) => {
                    if (event.key === 'c') {  // Tecla C para cambiar ángulo de cámara
                        this.player.switchCameraAngle();
                    }
                });
            }

            onWindowResize() {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);

                // Notificar al jugador del redimensionamiento si es necesario
                if (this.player.onWindowResize) {
                    this.player.onWindowResize();
                }
            }

            animate() {
                const deltaTime = Math.min(0.05, this.gameWorld.clock.getDelta()) / STEPS_PER_FRAME;
        
                // Actualización física en pasos discretos
                for (let i = 0; i < STEPS_PER_FRAME; i++) {
                    this.player.controls(deltaTime);
                    this.player.update(deltaTime);
                    this.ballManager.updateSpheres(deltaTime);
                    this.player.teleportIfOob();
                    
                    // Verificar colisiones entre bolas y blancos
                    this.targetManager.checkAllCollisions();
                }
        
                // Renderizado
                this.renderer.render(this.gameWorld.scene, this.camera);
        
                // Actualizar estadísticas
                this.stats.update();
        
                // Actualizar puntuación
                this.scoreElement.textContent = `Puntuación: ${this.targetManager.getScore()}`;
            }

            // Método para limpieza
            dispose() {
                window.removeEventListener('resize', this.onWindowResize);
                this.renderer.dispose();
                if (this.gameWorld) this.gameWorld.dispose();
                if (this.player) this.player.dispose();
            }

}