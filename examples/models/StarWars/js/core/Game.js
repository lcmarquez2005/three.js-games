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
    this.isLoading = true; // Nuevo: Bandera de carga
    this.loadingProgress = 0; // Nuevo: Progreso de carga
    this.totalAssets = 3; // Ajustar según activos principales
  }

 async init() {
    try {
      // Mostrar pantalla de carga
      this.showLoadingScreen();

      // 1. Configuración inicial de audio
      this.configureAudio();
      this.updateProgress(10); // Actualizar progreso

      // 2. Inicialización de la escena
      await this.initializeScene();
      this.updateProgress(30); // Actualizar progreso

      // 3. Configuración de VR
      this.setupVR();
      this.updateProgress(40); // Actualizar progreso

      // 4. Configuración de controladores VR
      await this.setupVRControllers();
      this.updateProgress(60); // Actualizar progreso

      // 5. Inicialización de entidades y sistemas de juego
      await this.initializeGameEntities();
      this.updateProgress(90); // Actualizar progreso

      // Finalizar carga
      this.isLoading = false;
      this.hideLoadingScreen();
      console.log("Todos los recursos han terminado de cargar");

      // 6. Inicio del bucle principal
      this.startGameLoop();

    } catch (error) {
      console.error('Error durante la inicialización del juego:', error);
      this.handleInitError(error);
    }
  }

  
  // Nuevo: Mostrar pantalla de carga
  showLoadingScreen() {
    this.loadingScreen = document.createElement('div');
    this.loadingScreen.style.position = 'fixed';
    this.loadingScreen.style.top = '0';
    this.loadingScreen.style.left = '0';
    this.loadingScreen.style.width = '100%';
    this.loadingScreen.style.height = '100%';
    this.loadingScreen.style.backgroundColor = 'black';
    this.loadingScreen.style.zIndex = '1000';
    this.loadingScreen.style.display = 'flex';
    this.loadingScreen.style.flexDirection = 'column';
    this.loadingScreen.style.justifyContent = 'center';
    this.loadingScreen.style.alignItems = 'center';
    this.loadingScreen.style.color = 'white';
    this.loadingScreen.style.fontFamily = 'Arial, sans-serif';
    
    this.loadingText = document.createElement('div');
    this.loadingText.textContent = 'Cargando recursos... 0%';
    this.loadingText.style.fontSize = '24px';
    this.loadingText.style.marginBottom = '20px';
    
    this.progressBar = document.createElement('div');
    this.progressBar.style.width = '300px';
    this.progressBar.style.height = '20px';
    this.progressBar.style.backgroundColor = '#333';
    this.progressBar.style.borderRadius = '10px';
    this.progressBar.style.overflow = 'hidden';
    
    this.progressFill = document.createElement('div');
    this.progressFill.style.width = '0%';
    this.progressFill.style.height = '100%';
    this.progressFill.style.backgroundColor = '#4CAF50';
    this.progressFill.style.transition = 'width 0.3s ease';
    
    this.progressBar.appendChild(this.progressFill);
    this.loadingScreen.appendChild(this.loadingText);
    this.loadingScreen.appendChild(this.progressBar);
    
    document.body.appendChild(this.loadingScreen);
  }

  
  // Nuevo: Actualizar progreso de carga
  updateProgress(percent) {
    this.loadingProgress = percent;
    
    if (this.loadingText) {
      this.loadingText.textContent = `Cargando recursos... ${percent}%`;
    }
    
    if (this.progressFill) {
      this.progressFill.style.width = `${percent}%`;
    }
  }

    // Nuevo: Ocultar pantalla de carga
  hideLoadingScreen() {
    if (this.loadingScreen) {
      document.body.removeChild(this.loadingScreen);
      this.loadingScreen = null;
    }
  }


  async configureAudio() {
    try {
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = 0.5;
      
      // Esperar a que el audio esté listo para reproducir
      await new Promise((resolve) => {
        this.backgroundMusic.oncanplaythrough = resolve;
        this.backgroundMusic.load();
      });
      
      // Reproducir solo si el usuario ya ha interactuado
      const playAudio = () => {
        if (document.visibilityState === 'visible') {
          this.backgroundMusic.play().catch(e => {
            console.warn('Reproducción automática bloqueada:', e);
          });
          document.removeEventListener('click', playAudio);
        }
      };
      
      document.addEventListener('click', playAudio);
    } catch (e) {
      console.warn('No se pudo reproducir audio:', e);
    }
  }



  async initializeScene() {
    this.sceneManager = new SceneManager();
    
    // Agregar callback para reportar progreso de carga
    this.sceneManager.onProgress = (progress) => {
      const sceneProgress = 30 * (progress / 100); // 30% del total
      this.updateProgress(10 + sceneProgress); // Sumar al progreso base
    };
    
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
    
    this.updateProgress(70); // Actualizar progreso
  }

  async initializeGameEntities() {
    // Input system
    this.input = new Input();
    
    // Player con reporte de progreso
    this.player = new Player(this.sceneManager.scene, this.input);
    
    // Agregar callback para reportar progreso de carga del jugador
    this.player.onProgress = (progress) => {
      const playerProgress = 30 * (progress / 100); // 30% del total
      this.updateProgress(60 + playerProgress); // Sumar al progreso base
    };
    
    await this.player.loadModel();
    
    // Configurar cámara para seguir al jugador
    this.sceneManager.setTarget(this.player.model);
    
    // Enemy system - pero no empezamos a generar enemigos aún
    this.enemyManager = new EnemyManager(this.sceneManager.scene, this.player);
    
    // Marcar que la carga del jugador ha terminado
    this.updateProgress(90);
  }
  
  
  startGameLoop() {
    this.sceneManager.renderer.setAnimationLoop((timestamp, frame) => {
      try {
        const delta = this.clock.getDelta();
        
        // Solo procesar inputs y actualizar estado si no estamos cargando
        if (!this.isLoading) {
          this.processInputs(frame);
          this.updateGameState(delta);
          
          // Limitar movimiento físico en VR
          if (this.sceneManager.renderer.xr.isPresenting && frame) {
            this.limitPhysicalMovement(frame);
          }
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
    // Solo actualizar jugador y enemigos si no estamos cargando
    if (!this.isLoading) {
      this.player.update(delta, this.sceneManager.solidObjects);
      this.enemyManager.update(delta);
    }
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