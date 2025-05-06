class Player {
	constructor(scene, loader, modelUrl) {
		this.scene = scene;
		this.loader = loader;
		this.modelUrl = modelUrl;
		this.model = null;
		this.velocity = new THREE.Vector3();
		this.direction = new THREE.Vector3();
		this.speed = 5;
		this.keys = {};

		this.init();
	}

	init() {
		this.loader.load(this.modelUrl, (gltf) => {
			this.model = gltf.scene;
			this.model.scale.set(1, 1, 1);
			this.scene.add(this.model);
		});
	}

	update(deltaTime) {
		this.updateDirection();
		this.velocity.copy(this.direction).multiplyScalar(this.speed * deltaTime);

		if (this.model) {
			this.model.position.add(this.velocity);

			// Rotar el personaje según el movimiento
			if (this.direction.lengthSq() > 0.001) {
				const target = this.model.position.clone().add(this.direction);
				this.model.lookAt(target);
			}
		}
	}

	updateDirection() {
		this.direction.set(0, 0, 0);

		if (this.keys['w']) this.direction.z -= 1;
		if (this.keys['s']) this.direction.z += 1;
		if (this.keys['a']) this.direction.x -= 1;
		if (this.keys['d']) this.direction.x += 1;

		this.direction.normalize();
	}

	handleKey(event, isDown) {
		this.keys[event.key.toLowerCase()] = isDown;
	}
}

class ThirdPersonCamera {
	constructor(camera, target) {
		this.camera = camera;
		this.target = target;
		this.offset = new THREE.Vector3(0, 2, -5);
	}

	update() {
		if (!this.target || !this.target.model) return;

		const targetPosition = this.target.model.position.clone();
		const offsetRotated = this.offset.clone().applyQuaternion(this.target.model.quaternion);
		this.camera.position.copy(targetPosition).add(offsetRotated);
		this.camera.lookAt(targetPosition);
	}
}

let scene, camera, renderer, clock;
let player, cameraController;

init();
animate();

function init() {
	scene = new THREE.Scene();
	scene.background = new THREE.Color(0x87ceeb);

	camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
	camera.position.set(0, 2, -5);

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	document.body.appendChild(renderer.domElement);

	const light = new THREE.DirectionalLight(0xffffff, 1);
	light.position.set(5, 10, 5);
	scene.add(light);

	const ambient = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(ambient);

	const ground = new THREE.Mesh(
		new THREE.PlaneGeometry(100, 100),
		new THREE.MeshStandardMaterial({ color: 0x228B22 })
	);
	ground.rotation.x = -Math.PI / 2;
	scene.add(ground);

	clock = new THREE.Clock();

	const loader = new THREE.GLTFLoader();
	player = new Player(scene, loader, 'my-character.glb');
	cameraController = new ThirdPersonCamera(camera, player);

	window.addEventListener('keydown', (e) => player.handleKey(e, true));
	window.addEventListener('keyup', (e) => player.handleKey(e, false));
	window.addEventListener('resize', onWindowResize);
}

function animate() {
	requestAnimationFrame(animate);
	const delta = clock.getDelta();

	player.update(delta);
	cameraController.update();

	renderer.render(scene, camera);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}
