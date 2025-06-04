import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.177.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.177.0/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.177.0/examples/jsm/webxr/XRControllerModelFactory.js';


import { SceneManager } from './SceneManager.js';
import { Input } from './Input.js';
import { Player } from '../entities/Player.js';
import { EnemyManager } from '../entities/EnemyManager.js';
export class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.backgroundMusic = new Audio('./js/assets/sounds/main-theme.mp3');
    this.controllers = [];
    this.originalReferenceSpace = null;
    this.lastPosition = new THREE.Vector3();
  }

  async init() {
    try {
      // 1. Configuración inicial de audio
      this.configureAudio();

      // 2. Inicialización de la escena
      await this.initializeScene();

      // 3. Configuración de VR
      this.setupVR();

      // 4. Configuración de controladores VR
      await this.setupVRControllers();

      // 5. Inicialización de entidades y sistemas de juego
      await this.initializeGameEntities();

      // 6. Inicio del bucle principal
      this.startGameLoop();

    } catch (error) {
      console.error('Error durante la inicialización del juego:', error);
      this.handleInitError(error);
    }
  }

  async configureAudio() {
    try {
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = 0.5;
      await this.backgroundMusic.play();
    } catch (e) {
      console.warn('No se pudo reproducir audio:', e);
    }
  }

  async initializeScene() {
    this.sceneManager = new SceneManager();
    await this.sceneManager.init();
  }

  setupVR() {
    if (!this.sceneManager || !this.sceneManager.renderer) {
      throw new Error('Renderer no está disponible');
    }
    
    // Habilitar XR
    this.sceneManager.renderer.xr.enabled = true;
    
    // Crear botón VR
    const vrButton = VRButton.createButton(this.sceneManager.renderer);
    document.body.appendChild(vrButton);
    
    // Configurar el reference space cuando la sesión comience
    this.sceneManager.renderer.xr.addEventListener('sessionstart', async () => {
      // Obtener la sesión
      const session = this.sceneManager.renderer.xr.getSession();
      
      if (!session) {
        console.error("No se pudo obtener la sesión XR");
        return;
      }
      
      try {
        // Crear nuevo reference space de tipo 'local'
        this.originalReferenceSpace = await session.requestReferenceSpace('local');
        
        // Establecer el reference space modificado
        this.sceneManager.renderer.xr.setReferenceSpace(this.originalReferenceSpace);
        
        console.log("VR session started with local reference space");
      } catch (error) {
        console.error("Error setting up reference space:", error);
      }
    });
    
    // Resetear cuando termine la sesión
    this.sceneManager.renderer.xr.addEventListener('sessionend', () => {
      console.log("VR session ended");
      this.originalReferenceSpace = null;
      this.lastPosition.set(0, 0, 0);
    });
    
    // Asegúrate que el renderer XR esté disponible para el jugador
    if (this.player) {
      this.player.renderer = this.sceneManager.renderer;
    }
  }

  async setupVRControllers() {
    const controllerModelFactory = new XRControllerModelFactory();
    
    for (let i = 0; i < 2; i++) {
      const controller = this.sceneManager.renderer.xr.getController(i);
      controller.userData.index = i;
      
      controller.addEventListener('selectstart', () => {
        console.log(`Controller ${i} - selectstart`);
        this.handleControllerSelect(i);
      });
      
      this.sceneManager.scene.add(controller);
      this.controllers.push(controller);

      const grip = this.sceneManager.renderer.xr.getControllerGrip(i);
      grip.add(controllerModelFactory.createControllerModel(grip));
      this.sceneManager.scene.add(grip);
    }
  }

  async initializeGameEntities() {
    // Input system
    this.input = new Input();
    
    // Player
    this.player = new Player(this.sceneManager.scene, this.input);
    await this.player.loadModel();
    this.player.setControllers(this.controllers);
    
    // Configurar cámara para seguir al jugador
    this.sceneManager.setTarget(this.player.model);
    
    // Enemy system
    this.enemyManager = new EnemyManager(this.sceneManager.scene, this.player);
  }

  startGameLoop() {
    this.sceneManager.renderer.setAnimationLoop((timestamp, frame) => {
      try {
        const delta = this.clock.getDelta();
        this.processInputs(frame);
        this.updateGameState(delta);
        
        // Limitar movimiento físico en VR
        if (this.sceneManager.renderer.xr.isPresenting && frame) {
          this.limitPhysicalMovement(frame);
        }
        
        this.sceneManager.render();
      } catch (error) {
        console.error('Error en el game loop:', error);
      }
    });
  }

  limitPhysicalMovement(frame) {
    // Obtener la posición del visor
    const viewerPose = frame.getViewerPose(this.originalReferenceSpace);
    if (!viewerPose) return;
    
    const position = viewerPose.transform.position;
    const currentPosition = new THREE.Vector3(
      position.x,
      position.y,
      position.z
    );
    
    // Calcular la distancia desde la última posición guardada
    const distance = currentPosition.distanceTo(this.lastPosition);
    
    // Si el usuario se ha movido más de 1 unidad, restablecer su posición
    if (distance > 1.0) {
      // Crear una transformación para volver a la posición original
      const resetTransform = new XRRigidTransform(
        { x: this.lastPosition.x, y: this.lastPosition.y, z: this.lastPosition.z },
        viewerPose.transform.orientation
      );
      
      // Crear nuevo reference space con la posición restablecida
      const newReferenceSpace = this.originalReferenceSpace.getOffsetReferenceSpace(resetTransform);
      this.sceneManager.renderer.xr.setReferenceSpace(newReferenceSpace);
      
      console.log("Movimiento físico limitado. Restableciendo posición.");
    } else {
      // Guardar la posición actual para la próxima comprobación
      this.lastPosition.copy(currentPosition);
    }
  }

  processInputs(frame) {
    if (!frame) return;
    
    const session = this.sceneManager.renderer.xr.getSession();
    if (!session) return;

    for (const source of session.inputSources) {
      if (!source?.gamepad) continue;
      
      const { axes, buttons } = source.gamepad;
      
      // Manejo de gatillo
      if (buttons[0]?.pressed) {
        this.player.shootLaser();
      }
      
      // Manejo de joystick
      const x = axes[2] || 0;
      const y = axes[3] || 0;
      
      if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
        this.player.handleJoystickInput(x, y);
      }
    }
  }

  updateGameState(delta) {
    this.player.update(delta, this.sceneManager.solidObjects);
    this.enemyManager.update(delta);
  }

  handleControllerSelect(controllerIndex) {
    // Lógica para manejar el evento de selección
    this.player.shootLaser();
  }

  handleInitError(error) {
    // Mostrar mensaje de error al usuario
    Swal.fire({
      title: 'Error de inicialización',
      text: 'No se pudo cargar el juego correctamente. Por favor recarga la página.',
      icon: 'error',
      confirmButtonText: 'Recargar'
    }).then(() => {
      window.location.reload();
    });
  }
}