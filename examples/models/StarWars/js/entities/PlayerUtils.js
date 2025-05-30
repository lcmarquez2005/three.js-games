import * as THREE from 'three';

export function createEngineParticles() {
    const particleCount = 100;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 0.1;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 0.1;
        positions[i * 3 + 2] = Math.random() * 0.01;
        sizes[i] = 0.1 + Math.random() * 0.3;

        colors[i * 3] = 0.8 + Math.random() * 0.2;
        colors[i * 3] = 0.4 + Math.random() * 0.3;
        colors[i * 3 + 2] = Math.random() * 0.2;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
        size: 0.8,
        vertexColors: true,
        transparent: true,
        opacity: 0.1,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true
    });

    const engineParticles = new THREE.Points(particles, particleMaterial);
    engineParticles.renderOrder = 1;
    return engineParticles;
}

export function updateEngineParticles(engineParticles, currentSpeed, maxSpeed) {
    if (!engineParticles) return;

    const positions = engineParticles.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] = -3 - Math.random() * 2 * (currentSpeed / maxSpeed);
    }
    engineParticles.material.opacity = currentSpeed < 1 ? 0.0 : 0.8;
    engineParticles.geometry.attributes.position.needsUpdate = true;
}

export function updateHUD(lives, score) {
    const hudContainer = document.getElementById('hud-container') || createHUDContainer();
    hudContainer.innerHTML = '';

    // Dibujar corazones
    const heartContainer = document.createElement('div');
    heartContainer.style.display = 'flex';
    heartContainer.style.gap = '5px';

    for (let i = 0; i < lives; i++) {
        const heart = document.createElement('img');
        heart.src = './js/assets/images/heart.png';
        heart.style.width = '30px';
        heart.style.height = '30px';
        heartContainer.appendChild(heart);
    }

    hudContainer.appendChild(heartContainer);

    // Dibujar puntaje
    const scoreElement = document.createElement('div');
    scoreElement.textContent = `Score: ${score}`;
    scoreElement.style.color = '#ffffff';
    scoreElement.style.fontSize = '20px';
    scoreElement.style.fontFamily = 'Arial, sans-serif';
    hudContainer.appendChild(scoreElement);
}

function createHUDContainer() {
    const container = document.createElement('div');
    container.id = 'hud-container';
    container.style.position = 'absolute';
    container.style.top = '10px';
    container.style.left = '10px';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.zIndex = '1000';
    document.body.appendChild(container);
    return container;
}