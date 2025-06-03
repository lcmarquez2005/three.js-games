import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { VRButton } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/webxr/XRControllerModelFactory.js';

import { SceneManager } from './SceneManager.js';
import { Input } from './Input.js';
import { Player } from '../entities/Player.js';
import { EnemyManager } from '../entities/EnemyManager.js';

export class Game {
  constructor() {
    this.clock = new THREE.Clock();
    this.backgroundMusic = new Audio('./js/assets/sounds/main-theme.mp3');
    this.controllers = [];
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

// Métodos auxiliares desglosados:

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
    
    this.sceneManager.renderer.xr.enabled = true;
    const vrButton = VRButton.createButton(this.sceneManager.renderer);
    document.body.appendChild(vrButton);
    
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
      this.sceneManager.render();
    } catch (error) {
      console.error('Error en el game loop:', error);
    }
  });
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
    
    // Manejo de joystick (puedes mover esto a la clase Player)
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
