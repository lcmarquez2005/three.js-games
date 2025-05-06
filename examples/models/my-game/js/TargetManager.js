import * as THREE from 'three';
import { TARGET_CONFIG } from './constants.js';

export class TargetManager {
    constructor(scene, worldOctree, ballManager) {
        this.scene = scene;
        this.worldOctree = worldOctree;
        this.ballManager = ballManager;
        this.targets = [];
        this.score = 0;
        
        this.generateRandomTargets(5);
    }

    createTarget(position) {
        const targetGroup = new THREE.Group();
        targetGroup.position.copy(position);
        
        const { 
            RADIUS, 
            HEIGHT, 
            RADIAL_SEGMENTS,
            COLORS,
            MATERIAL_PROPS,
            RING_COUNT,
            CENTER_RADIUS_RATIO
        } = TARGET_CONFIG;
    
        // Crear anillos concéntricos
        for (let i = RING_COUNT; i > 0; i--) {
            const radius = (RADIUS * i) / RING_COUNT;
            const ringGeometry = new THREE.CylinderGeometry(
                radius, radius, HEIGHT, RADIAL_SEGMENTS
            );
        
            const isRed = i % 2 === (RING_COUNT % 2);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: isRed ? COLORS.RED : COLORS.WHITE,
                side: THREE.DoubleSide
            });
        
            // Anillo frontal
            const ringFront = new THREE.Mesh(ringGeometry, ringMaterial);
            ringFront.position.z = (RING_COUNT - i) * 0.002; // frente
            ringFront.rotation.x = Math.PI / 2;
            ringFront.castShadow = true;
            ringFront.receiveShadow = true;
            targetGroup.add(ringFront);
        
            // Anillo trasero (inverso, para que no se traslapen)
            const ringBack = new THREE.Mesh(ringGeometry, ringMaterial);
            ringBack.position.z = -(RING_COUNT - i) * 0.002; // fondo
            ringBack.rotation.x = Math.PI / 2;
            ringBack.castShadow = true;
            ringBack.receiveShadow = true;
            targetGroup.add(ringBack);
        }
        
    
        // Círculo central
        const centerGeometry = new THREE.CylinderGeometry(
            RADIUS * CENTER_RADIUS_RATIO, 
            RADIUS * CENTER_RADIUS_RATIO, 
            HEIGHT * 1.1, 
            RADIAL_SEGMENTS
        );
        const centerMaterial = new THREE.MeshBasicMaterial({
            color: COLORS.BLACK
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.rotation.x = Math.PI / 2; // también acostado
        center.castShadow = true;
        center.receiveShadow = true;
        targetGroup.add(center);
    
        // Configuración del target
        targetGroup.userData = {
            points: TARGET_CONFIG.BASE_POINTS,
            isTarget: true,
            radius: RADIUS
        };
    
        // Probabilidad de girar en el eje Y
        const ROTATION_PROBABILITY = 1; // 10%
        if (Math.random() < ROTATION_PROBABILITY) {
            targetGroup.rotation.y = Math.random() * Math.PI * 2;
        }
    
        this.scene.add(targetGroup);
        this.targets.push(targetGroup);
        return targetGroup;
    }
    

    // Método para verificar colisiones que llamaremos desde Game.animate()
    checkAllCollisions() {
        // Verificar solo esferas activas
        const activeSpheres = this.ballManager.spheres.filter(sphere => sphere.active);
        
        for (const sphere of activeSpheres) {
            this.checkTargetCollisions(sphere);
        }
    }

    checkTargetCollisions(sphere) {
        const { COLLISION_OFFSET, BASE_POINTS } = TARGET_CONFIG;
        
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const target = this.targets[i];
            const distance = sphere.collider.center.distanceTo(target.position);
            
            if (distance < (sphere.collider.radius + target.userData.radius + COLLISION_OFFSET)) {
                const hitDistance = distance / target.userData.radius;
                const points = Math.max(1, Math.floor(BASE_POINTS * (1 - hitDistance)));
                
                this.score += points;
                console.log(`¡Blanco alcanzado! +${points} puntos (Total: ${this.score})`);
                this.destroyTarget(i);
                
                if (this.targets.length === 0) {
                    this.generateRandomTargets(5);
                }
            }
        }
    }

    generateRandomTargets(count) {
        const { AREA_SIZE, MIN_HEIGHT, MAX_HEIGHT, SPAWN_OFFSET } = TARGET_CONFIG;
        
        this.clearAllTargets();
        
        for (let i = 0; i < count; i++) {
            const position = new THREE.Vector3(
                (Math.random() - 0.5) * AREA_SIZE,
                MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT),
                (Math.random() - 0.5) * AREA_SIZE
            );
            
            if (!this.worldOctree.sphereIntersect(new THREE.Sphere(position, SPAWN_OFFSET))) {
                this.createTarget(position);
            } else {
                i--; // Reintentar si la posición no es válida
            }
        }
    }

    destroyTarget(index) {
        const { 
            PARTICLE_COUNT, 
            PARTICLE_SIZE, 
            EXPLOSION_STRENGTH,
            EXPLOSION_DURATION,
            COLORS
        } = TARGET_CONFIG;
        
        const target = this.targets[index];
        const explosionGroup = new THREE.Group();
        explosionGroup.position.copy(target.position);
        
        // Crear partículas de explosión
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const size = PARTICLE_SIZE.MIN + Math.random() * (PARTICLE_SIZE.MAX - PARTICLE_SIZE.MIN);
            const geometry = new THREE.SphereGeometry(size, 8, 8);
            const isRed = Math.random() > 0.5;
            
            const material = new THREE.MeshBasicMaterial({
                color: isRed ? COLORS.RED : COLORS.WHITE,
                // emissive: isRed ? COLORS.RED_EMISSIVE : 0x444444,
                // emissiveIntensity: 0.5
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            particle.position.set(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            );
            
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * EXPLOSION_STRENGTH,
                    (Math.random() - 0.5) * EXPLOSION_STRENGTH,
                    (Math.random() - 0.5) * EXPLOSION_STRENGTH
                ),
                lifetime: 0
            };
            
            explosionGroup.add(particle);
        }
        
        this.scene.add(explosionGroup);
        this.scene.remove(target);
        this.targets.splice(index, 1);
        
        // Animación de explosión
        const animateExplosion = () => {
            explosionGroup.children.forEach(particle => {
                particle.position.add(
                    particle.userData.velocity.clone().multiplyScalar(0.016)
                );
                particle.userData.lifetime += 0.016;
                particle.material.opacity = 1 - (particle.userData.lifetime / EXPLOSION_DURATION);
                particle.material.transparent = particle.material.opacity < 1;
            });
            
            if (explosionGroup.children[0]?.userData.lifetime < EXPLOSION_DURATION) {
                requestAnimationFrame(animateExplosion);
            } else {
                this.scene.remove(explosionGroup);
            }
        };
        
        animateExplosion();
    }

    clearAllTargets() {
        this.targets.forEach(target => this.scene.remove(target));
        this.targets = [];
    }

    getScore() {
        return this.score;
    }
}