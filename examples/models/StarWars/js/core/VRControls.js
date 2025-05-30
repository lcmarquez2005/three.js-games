class VRControls {
    constructor(model, renderer, scene) {
        this.model = model;
        this.renderer = renderer;
        this.scene = scene;
        this.controllers = [];
        this.controllerGrips = [];
        this.movementSpeed = 5;
        this.setupControllers();
    }

    setupControllers() {
        if (!this.renderer.xr) return;

        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            controller.addEventListener('selectstart', () => this.onSelectStart(i));
            controller.addEventListener('selectend', () => this.onSelectEnd(i));
            this.controllers.push(controller);
            this.scene.add(controller);

            const grip = this.renderer.xr.getControllerGrip(i); // <--- corregido
            this.controllerGrips.push(grip); // <--- corregido
            this.scene.add(grip);
        }
    }

    onSelectStart(controllerIndex) {
        console.log(`Controller ${controllerIndex} trigger pressed`);
    }

    onSelectEnd(controllerIndex) {
        console.log(`Controller ${controllerIndex} trigger released`);
    }

    getHandsMidpoint() {
        if (this.controllers.length < 2) return null;

        const leftPos = new THREE.Vector3();
        const rightPos = new THREE.Vector3();

        this.controllers[0].getWorldPosition(leftPos);
        this.controllers[1].getWorldPosition(rightPos);

        return new THREE.Vector3().addVectors(leftPos, rightPos).multiplyScalar(0.5);
    }

    getMovementVector() {
        const handsMid = this.getHandsMidpoint();
        if (!handsMid) return new THREE.Vector3();

        const shipPos = this.model.position.clone();
        const direction = new THREE.Vector3().subVectors(handsMid, shipPos);

        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.model.quaternion);
        const dotProduct = direction.dot(forward);

        if (dotProduct > 0 && direction.length() > 0.3) {
            return forward.multiplyScalar(Math.min(direction.length() * 2, 1) * this.movementSpeed); // <--- corregido paréntesis
        }

        return new THREE.Vector3();
    }

    update(delta) {
        if (!this.isInVR()) return;

        const movement = this.getMovementVector().multiplyScalar(delta);
        this.model.position.add(movement);
    }

    isInVR() {
        return this.renderer.xr && this.renderer.xr.isPresenting;
    }
}
