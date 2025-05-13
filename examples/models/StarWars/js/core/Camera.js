import * as THREE from 'three';

export class PlayerCamera {
    constructor(player) {
        this.player = player;
        this.camera = player.camera;
        
        // Configuración de cámara en tercera persona
        this.offset = new THREE.Vector3(0, 1.5, -2);
        this.lookAtHeight = 1;
        this.rotation = new THREE.Vector2(0, 0);
    }

    update(deltaTime) {
        const quaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
                THREE.MathUtils.clamp(this.rotation.x, -Math.PI/3, Math.PI/3),
                this.rotation.y,
                0,
                'YXZ'
            )
        );

        const offset = this.offset.clone().applyQuaternion(quaternion);
        const targetPosition = this.player.playerCollider.end.clone().add(offset);
        this.camera.position.lerp(targetPosition, 0.1);

        const lookAt = this.player.playerCollider.end.clone();
        lookAt.y += this.lookAtHeight;
        this.camera.lookAt(lookAt);

        this.camera.getWorldDirection(this.player.playerDirection);
        this.player.playerDirection.y = 0;
        this.player.playerDirection.normalize();
    }
    getThrowDirection() {
        const direction = new THREE.Vector3(0, 0, 1);
        const quaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(this.rotation.x, this.rotation.y, 0, 'YXZ')
        );
        return direction.applyQuaternion(quaternion).normalize();
    }

    rotate(deltaX, deltaY) {
        this.rotation.y -= deltaX;
        this.rotation.x -= deltaY;
    }

    reset() {
        this.rotation.set(0, 0);
        this.update(0);
    }
}