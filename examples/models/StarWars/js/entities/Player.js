import * as THREE from 'three';
import { GLTFLoader } from '../../../../jsm/loaders/GLTFLoader.js';
import { EffectsManager } from '../core/EffectsManager.js';
import { 
    createEngineParticles, 
    updateEngineParticles, 
    updateHUD 
} from './PlayerUtils.js';
import { 
    shootLaser, 
    takeDamage, 
    addScore, 
    gameOver 
} from './PlayerActions.js';

export class Player {
    constructor(scene, input, LaserClass) {
        this.scene = scene;
        this.input = input;
        this.LaserClass = LaserClass; // Clase Laser inyectada

        // Parámetros de la nave
        this.speed = 15;
        this.maxSpeed = 30;
        this.acceleration = 1;
        this.rollSpeed = 0.1;
        this.pitchSpeed = 0.1;
        this.yawSpeed = 0.08;
        this.bankingFactor = 0.3;
        this.effects = new EffectsManager(this.scene);

        this.model = null;
        this.currentSpeed = 0;

        // Sistema de vidas y puntaje
        this.lives = 3;
        this.score = 0;
        this.isInvulnerable = false;
        this.invulnerabilityDuration = 1.5;
        this.invulnerabilityTimer = 0;
        
        // Sistema de disparo
        this.lasers = [];
        this.shootCooldown = 0.1;
        this.timeSinceLastShot = this.shootCooldown;
        this.laserConfig = {
            color: 0x00ff00,
            glowColor: 0x00ff00,
            speed: 80,
            maxDistance: 200,
            soundUrl: './js/assets/sounds/laser.mp3',
            size: 0.05,
            length: 1.5,
            reverseDirection: true 
        };

        // Límites del movimiento
        this.bounds = {
            minX: -4,
            maxX: 4,
            minY: 1,
            maxY: 15,
            minZ: -Infinity,
            maxZ: Infinity
        };

        // Sistema de partículas de motor
        this.engineParticles = createEngineParticles();
    }

    async loadModel() {
        const loader = new GLTFLoader();
        const glb = await loader.loadAsync('./js/assets/models/main.glb');
        this.model = glb.scene;
        this.model.renderOrder = 0;

        this.model.position.set(0, 5, -2);
        this.model.rotation.y = Math.PI;
        this.scene.add(this.model);

        if (this.engineParticles) {
            this.engineParticles.position.set(0, 0, 2);
            this.model.add(this.engineParticles);
        }
    }

    update(delta) {
        if (!this.model) return;

        updateHUD(this.lives, this.score);

        if (this.isInvulnerable) {
            this.invulnerabilityTimer += delta;
            if (this.invulnerabilityTimer >= this.invulnerabilityDuration) {
                this.isInvulnerable = false;
            }
        }

        if (this.input.isKeyPressed('ShiftLeft')) {
            this.currentSpeed = THREE.MathUtils.lerp(
                this.currentSpeed,
                this.maxSpeed,
                this.acceleration * delta
            );
        } else if (this.input.isKeyPressed('ControlLeft')) {
            this.currentSpeed = THREE.MathUtils.lerp(
                this.currentSpeed,
                this.maxSpeed * 0.1,
                this.acceleration * delta
            );
        } else {
            this.currentSpeed = THREE.MathUtils.lerp(
                this.currentSpeed,
                this.speed,
                this.acceleration * delta
            );
        }

        const forwardVector = new THREE.Vector3(0, 0, 1)
            .applyQuaternion(this.model.quaternion)
            .multiplyScalar(this.currentSpeed * delta);

        const newPosition = this.model.position.clone().add(forwardVector);
        
        newPosition.x = THREE.MathUtils.clamp(
            newPosition.x,
            this.bounds.minX,
            this.bounds.maxX
        );
        newPosition.y = THREE.MathUtils.clamp(
            newPosition.y,
            this.bounds.minY,
            this.bounds.maxY
        );
        
        this.model.position.copy(newPosition);

        const targetEuler = new THREE.Euler().setFromQuaternion(this.model.quaternion);

        if (this.input.isKeyPressed('KeyE')) targetEuler.z += this.rollSpeed;
        if (this.input.isKeyPressed('KeyQ')) targetEuler.z -= this.rollSpeed;
        if (this.input.isKeyPressed('KeyW')) targetEuler.x -= this.pitchSpeed;
        if (this.input.isKeyPressed('KeyS')) targetEuler.x += this.pitchSpeed;
        if (this.input.isKeyPressed('KeyA')) {
            targetEuler.y += this.yawSpeed;
            targetEuler.z += this.yawSpeed * this.bankingFactor;
        }
        if (this.input.isKeyPressed('KeyD')) {
            targetEuler.y -= this.yawSpeed;
            targetEuler.z -= this.yawSpeed * this.bankingFactor;
        }

        const targetQuaternion = new THREE.Quaternion().setFromEuler(targetEuler);
        this.model.quaternion.slerp(targetQuaternion, 0.2);

        updateEngineParticles(this.engineParticles, this.currentSpeed, this.maxSpeed);

        this.timeSinceLastShot += delta;
        if (this.input.mouseDown || this.input.isKeyPressed('Space')) {
            shootLaser(this);
        }

        this.lasers = this.lasers.filter(laser => {
            laser.update(delta);
            return !laser.isDestroyed;
        });
    }
}