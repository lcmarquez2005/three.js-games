import * as THREE from 'three';
import { 
    GRAVITY, 
    NUM_SPHERES, 
    SPHERE_RADIUS,
    FIREBALL_CONFIG,
    TEXTURE_PATHS
} from './constants.js';

const textureLoader = new THREE.TextureLoader();
const fireTexture = textureLoader.load(TEXTURE_PATHS.FIREBALL);

// Ajuste fino de la textura
fireTexture.wrapS = THREE.ClampToEdgeWrapping;
fireTexture.wrapT = THREE.ClampToEdgeWrapping;
fireTexture.center.set(0.5, 0.5);
fireTexture.rotation = 0;

export class BallManager {
    constructor(scene, worldOctree, player) {
        this.scene = scene;
        this.worldOctree = worldOctree;
        this.player = player;
        this.spheres = [];
        this.sphereIdx = 0;
        this.sphereLifetimes = new Array(NUM_SPHERES).fill(0);
        this.sphereFadeStarts = new Array(NUM_SPHERES).fill(0);


        // Geometría esférica con deformación para aspecto de fuego
        this.sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
        const positionAttr = this.sphereGeometry.attributes.position;

        for (let i = 0; i < positionAttr.count; i++) {
            const x = positionAttr.getX(i);
            const y = positionAttr.getY(i);
            const z = positionAttr.getZ(i);
            const scale = 1 + 0.3 * Math.random();
            positionAttr.setXYZ(i, x * scale, y * scale, z * scale);
        }
        positionAttr.needsUpdate = true;

        // Material que simula fuego con transparencia
        this.sphereMaterial = new THREE.MeshStandardMaterial({
            map: fireTexture,
            emissive: new THREE.Color(0xff4400),
            emissiveIntensity: 1.8,
            roughness: 0.4,
            metalness: 0.0,
            transparent: true,
            opacity: 1.0
        });

        // player.onBallThrow = () => this.throwBall(player.mouseTime);
        this.initSpheres();
    }

    initSpheres() {
        for (let i = 0; i < NUM_SPHERES; i++) {
            const sphereMesh = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial.clone());
            sphereMesh.castShadow = true;
            sphereMesh.receiveShadow = true;
            sphereMesh.visible = false;
            this.scene.add(sphereMesh);

            this.spheres.push({
                mesh: sphereMesh,
                collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), SPHERE_RADIUS),
                velocity: new THREE.Vector3(),
                active: false,
                userData: {}
            });
        }
    }

    throwBall(mouseTime) {
        const sphere = this.spheres[this.sphereIdx];
        sphere.active = true;
        sphere.mesh.visible = true;
        sphere.mesh.material.opacity = 1.0;

        const currentTime = performance.now();
        this.sphereLifetimes[this.sphereIdx] = currentTime + FIREBALL_CONFIG.LIFETIME;
        this.sphereFadeStarts[this.sphereIdx] = currentTime + FIREBALL_CONFIG.FADE_START;

        // Usamos la dirección de la cámara del jugador
        const throwDirection = this.player.cameraController.getThrowDirection();
        sphere.collider.center.copy(this.player.playerCollider.end)
            .addScaledVector(throwDirection, this.player.playerCollider.radius * 1.5);

        const impulse = FIREBALL_CONFIG.IMPULSE_BASE + 
                       FIREBALL_CONFIG.IMPULSE_MULTIPLIER * 
                       (1 - Math.exp((mouseTime - currentTime) * 0.001));
        
        sphere.velocity.copy(throwDirection).multiplyScalar(impulse);
        sphere.velocity.addScaledVector(this.player.playerVelocity, 2);

        this.sphereIdx = (this.sphereIdx + 1) % this.spheres.length;
    }

    updateSpheres(deltaTime) {
        const currentTime = performance.now();

        this.spheres.forEach((sphere, index) => {
            if (!sphere.active) return;

            // Manejar desvanecimiento
            if (currentTime > this.sphereFadeStarts[index]) {
                const fadeProgress = (currentTime - this.sphereFadeStarts[index]) / FIREBALL_CONFIG.FADE_DURATION;
                sphere.mesh.material.opacity = Math.max(0, 1 - fadeProgress);
            }

            // Desactivar cuando expire el tiempo
            if (currentTime > this.sphereLifetimes[index]) {
                sphere.active = false;
                sphere.mesh.visible = false;
                return;
            }

            // Actualizar física
            sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);

            const result = this.worldOctree.sphereIntersect(sphere.collider);
            if (result) {
                sphere.velocity.addScaledVector(result.normal, -result.normal.dot(sphere.velocity) * 1.5);
                sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
            } else {
                sphere.velocity.y -= GRAVITY * deltaTime;
            }

            const damping = Math.exp(-FIREBALL_CONFIG.DAMPING_FACTOR * deltaTime) - 1;
            sphere.velocity.addScaledVector(sphere.velocity, damping);

            this.handlePlayerSphereCollision(sphere);
        });

        this.handleSpheresCollisions();

        for (const sphere of this.spheres) {
            sphere.mesh.position.copy(sphere.collider.center);
        }
    }

    handlePlayerSphereCollision(sphere) {
        const center = new THREE.Vector3().addVectors(
            this.player.playerCollider.start,
            this.player.playerCollider.end
        ).multiplyScalar(0.5);

        const sphereCenter = sphere.collider.center;
        const r = this.player.playerCollider.radius + sphere.collider.radius;
        const r2 = r * r;

        for (const point of [this.player.playerCollider.start, this.player.playerCollider.end, center]) {
            const d2 = point.distanceToSquared(sphereCenter);
            if (d2 < r2) {
                const normal = new THREE.Vector3().subVectors(point, sphereCenter).normalize();
                const v1 = new THREE.Vector3().copy(normal).multiplyScalar(normal.dot(this.player.playerVelocity));
                const v2 = new THREE.Vector3().copy(normal).multiplyScalar(normal.dot(sphere.velocity));

                this.player.playerVelocity.add(v2).sub(v1);
                sphere.velocity.add(v1).sub(v2);

                const d = (r - Math.sqrt(d2)) / 2;
                sphereCenter.addScaledVector(normal, -d);
            }
        }
    }

    handleSpheresCollisions() {
        for (let i = 0; i < this.spheres.length; i++) {
            const s1 = this.spheres[i];
            if (!s1.active) continue;
            
            for (let j = i + 1; j < this.spheres.length; j++) {
                const s2 = this.spheres[j];
                if (!s2.active) continue;

                const d2 = s1.collider.center.distanceToSquared(s2.collider.center);
                const r = s1.collider.radius + s2.collider.radius;
                const r2 = r * r;

                if (d2 < r2) {
                    const normal = new THREE.Vector3().subVectors(s1.collider.center, s2.collider.center).normalize();
                    const v1 = new THREE.Vector3().copy(normal).multiplyScalar(normal.dot(s1.velocity));
                    const v2 = new THREE.Vector3().copy(normal).multiplyScalar(normal.dot(s2.velocity));

                    s1.velocity.add(v2).sub(v1);
                    s2.velocity.add(v1).sub(v2);

                    const d = (r - Math.sqrt(d2)) / 2;
                    s1.collider.center.addScaledVector(normal, d);
                    s2.collider.center.addScaledVector(normal, -d);
                }
            }
        }
    }
}