export class Controls {
    constructor(player) {
        this.player = player;
        this.keyStates = {};
        this.mouseTime = 0;
        this.onBallThrow = null;
        
        this.initEventListeners();
    }

    initEventListeners() {
        document.addEventListener('keydown', (event) => {
            this.keyStates[event.code] = true;
        });

        document.addEventListener('keyup', (event) => {
            this.keyStates[event.code] = false;
        });

        document.body.addEventListener('mousemove', (event) => {
            if (document.pointerLockElement === document.body) {
                this.player.cameraController.rotate(event.movementX / 500, event.movementY /-1000);
            }
        });

        document.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                this.mouseTime = performance.now();
                if (document.pointerLockElement !== document.body) {
                    document.body.requestPointerLock();
                }
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (event.button === 0 && document.pointerLockElement === document.body) {
                if (this.onBallThrow) {
                    this.onBallThrow(this.mouseTime);
                }
            }
        });
    }

    update(deltaTime) {
        const speedDelta = deltaTime * (this.player.playerOnFloor ? 25 : 8);

        if (this.keyStates['KeyW']) {
            this.player.playerVelocity.add(this.getForwardVector().multiplyScalar(speedDelta));
        }
        if (this.keyStates['KeyS']) {
            this.player.playerVelocity.add(this.getForwardVector().multiplyScalar(-speedDelta));
        }
        if (this.keyStates['KeyA']) {
            this.player.playerVelocity.add(this.getSideVector().multiplyScalar(-speedDelta));
        }
        if (this.keyStates['KeyD']) {
            this.player.playerVelocity.add(this.getSideVector().multiplyScalar(speedDelta));
        }
        if (this.player.playerOnFloor && this.keyStates['Space']) {
            this.player.playerVelocity.y = 15;
        }
    }

    getForwardVector() {
        this.player.camera.getWorldDirection(this.player.playerDirection);
        this.player.playerDirection.y = 0;
        this.player.playerDirection.normalize();
        return this.player.playerDirection;
    }

    getSideVector() {
        this.player.camera.getWorldDirection(this.player.playerDirection);
        this.player.playerDirection.y = 0;
        this.player.playerDirection.normalize();
        this.player.playerDirection.cross(this.player.camera.up);
        return this.player.playerDirection;
    }
}