import * as THREE from 'three';
import { GRAVITY, NUM_SPHERES, SPHERE_RADIUS } from './constants.js';

export class BallManager {
    constructor(scene, worldOctree, player) {
        this.scene = scene;
        this.worldOctree = worldOctree;
        this.player = player;
        this.spheres = [];
        this.sphereIdx = 0;

        this.sphereGeometry = new THREE.IcosahedronGeometry(SPHERE_RADIUS, 5);
        this.sphereMaterial = new THREE.MeshLambertMaterial({ color: 0xdede8d });
        // Configurar el callback para cuando el jugador quiera lanzar una bola
        player.onBallThrow = () => this.throwBall(player.mouseTime);

        this.initSpheres();
    }

    initSpheres() {
        for (let i = 0; i < NUM_SPHERES; i++) {
            const sphereMesh = new THREE.Mesh(this.sphereGeometry, this.sphereMaterial);
            sphereMesh.castShadow = true;
            sphereMesh.receiveShadow = true;
            this.scene.add(sphereMesh);

            this.spheres.push({
                mesh: sphereMesh,
                collider: new THREE.Sphere(new THREE.Vector3(0, -100, 0), SPHERE_RADIUS),
                velocity: new THREE.Vector3(),
                active: false,
                userData: {} // Añadimos userData para los blancos
            });
        }
    }

    throwBall(mouseTime) {
        const sphere = this.spheres[this.sphereIdx];
        sphere.active = true; // Marcamos como activa
        
        this.player.camera.getWorldDirection(this.player.playerDirection);
        sphere.collider.center.copy(this.player.playerCollider.end)
            .addScaledVector(this.player.playerDirection, this.player.playerCollider.radius * 1.5);
    
        const impulse = 15 + 30 * (1 - Math.exp((mouseTime - performance.now()) * 0.001));
        sphere.velocity.copy(this.player.playerDirection).multiplyScalar(impulse);
        sphere.velocity.addScaledVector(this.player.playerVelocity, 2);
    
        this.sphereIdx = (this.sphereIdx + 1) % this.spheres.length;
    }

    updateSpheres(deltaTime) {
        const vector1 = new THREE.Vector3();
        const vector2 = new THREE.Vector3();
        const vector3 = new THREE.Vector3();

        this.spheres.forEach(sphere => {
            sphere.collider.center.addScaledVector(sphere.velocity, deltaTime);
            const result = this.worldOctree.sphereIntersect(sphere.collider);

            if (result) {
                sphere.velocity.addScaledVector(result.normal, -result.normal.dot(sphere.velocity) * 1.5);
                sphere.collider.center.add(result.normal.multiplyScalar(result.depth));
            } else {
                sphere.velocity.y -= GRAVITY * deltaTime;
            }

            const damping = Math.exp(-1.5 * deltaTime) - 1;
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
            for (let j = i + 1; j < this.spheres.length; j++) {
                const s2 = this.spheres[j];
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