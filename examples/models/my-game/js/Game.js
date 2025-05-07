// Asume que ya tienes instalados three.js y sweetalert2
// npm install sweetalert2

import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { Rankings } from './Rankings.js';
import { GameWorld } from './GameWorld.js';
import { Lighting } from './Lighting.js';
import { Player } from './Player.js';
import { BallManager } from './BallManager.js';
import { TargetManager } from './TargetManager.js';
import { STEPS_PER_FRAME } from './constants.js';

export class Game {
    constructor() {
        this.container = document.getElementById('container');
        this.initRenderer();
        this.initCamera();
        this.time = 60;

        this.gameWorld = new GameWorld();
        this.lighting = new Lighting(this.gameWorld.scene);
        this.rankings = new Rankings('escapeRankings', 10);
        this.playerName = '';

        this.player = new Player(this.camera, this.gameWorld.worldOctree, this.gameWorld.scene);

        this.ballManager = new BallManager(
            this.gameWorld.scene,
            this.gameWorld.worldOctree,
            this.player
        );

        this.player.controls.onBallThrow = (mouseTime) => {
            this.ballManager.throwBall(mouseTime);
        };

        this.targetManager = new TargetManager(
            this.gameWorld.scene,
            this.gameWorld.worldOctree,
            this.ballManager,
            (level) => {
                if (level === 'win') {
                    clearInterval(this.timerInterval);
                    this.showVictoryScreen();
                } else {
                    this.time-=3;
                    this.startTimer(this.time);
                    this.levelElement.textContent = `Nivel: ${level}`;
                }
            }
        );

        this.setupScoreUI();
        this.initAudio();
        this.stats = this.initStats();
        this.initEventListeners();
        this.showIntro();
    }

    async showIntro() {
        const { value: name } = await Swal.fire({
            title: '🗝️ Escape del Cautiverio 🕳️',
            text: 'Ingresa tu nombre para comenzar',
            input: 'text',
            inputPlaceholder: 'Tu nombre o alias (máx. 15 caracteres)',
            background: '#222',
            color: '#fff',
            confirmButtonText: 'Comenzar 🚀',
            cancelButtonText: 'Salir ❌',
            allowOutsideClick: false,
            allowEscapeKey: true,
            allowEnterKey: true,
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value || value.length > 15) {
                    return '⚠️ Nombre inválido. Máx. 15 caracteres.';
                }
            }
        });
    
        if (!name) {
            window.close();
            return;
        }
    
        this.playerName = name;
    
        const playerBest = this.rankings.getPlayerBestScore(name);
        const welcomeMessage = `
            <div style="text-align: left;">
                <p>🧠 <strong>Objetivo:</strong> Escapa destruyendo todos los <span style="color:#0ff;">blancos</span> antes de que se acabe el ⏱️ tiempo.</p>
                <p>💣 Lanza esferas con precisión y acaba con cada objetivo disperso en el mapa 3D.</p>
                <p>📈 Hay <strong>10 niveles</strong>, y cada uno se vuelve más difícil. ¡Solo los mejores llegan al final! 🏆</p>
                <p>🕹️ Usa el mouse para lanzar y moverte libremente por el escenario.</p>
                ${playerBest > 0 
                    ? `<p>✨ ¡Bienvenido de vuelta, <strong>${name}</strong>! Tu mejor puntuación es <span style="color:#0f0;">${playerBest}</span>. ¿Podrás superarla?</p>` 
                    : `<p>🔓 ¡Buena suerte, <strong>${name}</strong>! ¿Tienes lo necesario para escapar?</p>`
                }
            </div>
        `;
    
        await Swal.fire({
            title: `🎮 ¡Listo, ${name}!`,
            html: welcomeMessage,
            confirmButtonText: '¡Jugar ahora! 🔥',
            background: '#222',
            color: '#fff',
            showCloseButton: false
        });
    
        this.loadGameWorld();
    }
    
    
    showVictoryScreen() {
        const score = this.targetManager.getScore();
        this.rankings.addEntry(this.playerName, score);
        
        Swal.fire({
            title: '¡Victoria!',
            html: `
                <p>${this.playerName}, completaste todos los niveles con ${score} puntos!</p>
                <div id="rankingContainer" style="margin: 20px 0;">
                    <h3>🏆 Top Jugadores 🏆</h3>
                    ${this.rankings.getRankingsHTML()}
                </div>
            `,
            icon: 'success',
            confirmButtonText: 'Jugar de nuevo',
            background: '#222',
            color: '#fff',
            allowOutsideClick: false,
            footer: '<a href="#" id="shareScore">Compartir mi puntuación</a>'
        }).then((result) => {
            if (result.isConfirmed) {
                location.reload();
            }
        });
    }

    setupScoreUI() {
        this.uiContainer = document.createElement('div');
        Object.assign(this.uiContainer.style, {
            position: 'absolute',
            top: '80px',
            left: '20px',
            padding: '10px 20px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            borderRadius: '10px',
            color: 'white',
            fontSize: '20px',
            fontFamily: 'Arial',
            lineHeight: '1.5em'
        });

        this.scoreElement = document.createElement('div');
        this.scoreElement.textContent = 'Puntos: 0';

        this.levelElement = document.createElement('div');
        this.levelElement.textContent = 'Nivel: 1';

        this.timerElement = document.createElement('div');
        this.timerElement.textContent = 'Tiempo: 60s';

        this.targetElement = document.createElement('div');
        this.targetElement.textContent = 'Blancos Restantes: ';

        this.uiContainer.appendChild(this.scoreElement);
        this.uiContainer.appendChild(this.levelElement);
        this.uiContainer.appendChild(this.timerElement);
        this.uiContainer.appendChild(this.targetElement);
        document.body.appendChild(this.uiContainer);
    }

    async loadGameWorld() {
        try {
            await this.gameWorld.loadWorld();
            this.player.resetPosition();
            this.startTimer(60);
            this.startAnimation();
        } catch (error) {
            console.error('Error loading game world:', error);
        }
    }

    startAnimation() {
        this.renderer.setAnimationLoop(() => this.animate());
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 2, -5);
    }

    initStats() {
        const stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        stats.domElement.style.left = '0px';
        this.container.appendChild(stats.domElement);
        return stats;
    }

    initAudio() {
        const audio = new Audio('./gameMusic.mp3');
        this.audio = audio;
        // console.log()
        audio.loop = true;
        audio.volume = 0.4;
        audio.play().catch(e => console.log("Audio playback blocked until user interaction."));
    }

    initEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());

        this.container.addEventListener('mousedown', (event) => {
            if (event.button === 0) {
                document.body.requestPointerLock();
                this.player.controls.mouseTime = performance.now();
            }
        });

        document.addEventListener('mouseup', (event) => {
            if (event.button === 0 && document.pointerLockElement !== null) {
                this.ballManager.throwBall();
            }
        });

        document.getElementById('showRankings')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showRankings();
        });

        document.addEventListener('click', (e) => {
            if (e.target.matches('#viewRankings, #viewRankings *')) {
                e.preventDefault();
                this.showRankings();
            }
            
            if (e.target.matches('#shareScore, #shareScore *')) {
                e.preventDefault();
                this.shareScore();
            }
        });
    }


    showRankings() {
        Swal.fire({
            title: '🏅 Ranking Histórico 🏅',
            html: `
                <div style="max-height: 60vh; overflow-y: auto; padding: 10px;">
                    ${this.rankings.getRankingsHTML(10)}
                </div>
                <button id="clearRankings" class="swal2-styled" 
                        style="background-color: #ff6b6b; margin-top: 10px;">
                    🗑️ Borrar Rankings
                </button>
            `,
            background: '#222',
            color: '#fff',
            confirmButtonText: 'Cerrar (ESC)',
            allowEscapeKey: true,
            allowEnterKey: false,
            focusConfirm: false,
            showCloseButton: true,
            didOpen: () => {
                document.getElementById('clearRankings').addEventListener('click', () => {
                    this.rankings.clearRankings();
                    Swal.fire({
                        title: 'Rankings borrados 🔥',
                        text: 'Todos los registros han sido eliminados',
                        icon: 'success',
                        confirmButtonText: 'OK (ENTER)',
                        allowEnterKey: true,
                        timer: 2000
                    }).then(() => this.showRankings());
                });
            }
        });
    }


    shareScore() {
        const score = this.targetManager.getScore();
        const text = `¡Acabo de completar Escape del Cautiverio con ${score} puntos! 🎮🏆 #EscapeDelCautiverio`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Mi puntuación en Escape del Cautiverio',
                text: text,
                url: window.location.href
            }).catch(() => this.copyToClipboard(text));
        } else {
            this.copyToClipboard(text);
        }
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            Swal.fire({
                title: '¡Copiado!',
                text: 'El texto se ha copiado al portapapeles',
                icon: 'success',
                timer: 2000
            });
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        const deltaTime = Math.min(0.05, this.gameWorld.clock.getDelta()) / STEPS_PER_FRAME;

        for (let i = 0; i < STEPS_PER_FRAME; i++) {
            this.player.controls.update(deltaTime);
            this.player.update(deltaTime);
            this.ballManager.updateSpheres(deltaTime);
            this.updateScoreUI();
            this.player.teleportIfOob();
            this.targetManager.checkAllCollisions();
        }

        this.renderer.render(this.gameWorld.scene, this.camera);
        this.stats.update();
    }

    updateScoreUI() {
        this.scoreElement.textContent = `Puntos: ${this.targetManager.getScore()}`;
        this.levelElement.textContent = `Nivel: ${this.targetManager.getLevel()}`;
        this.targetElement.textContent = `Blancos restantes: ${this.targetManager.targets.length}`;
    }

    startTimer(seconds) {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.timeLeft = seconds;
        this.timerElement.textContent = `Tiempo: ${this.timeLeft}s`;
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.timerElement.textContent = `Tiempo: ${this.timeLeft}s`;
            if (this.timeLeft <= 0) {
                clearInterval(this.timerInterval);
                this.endGame(false);
            }
        }, 1000);
    }

    endGame(won) {
        clearInterval(this.timerInterval);
        const score = this.targetManager.getScore();
        this.rankings.addEntry(this.playerName, score);
        
        Swal.fire({
            title: won ? '¡Has Escapado! 🎉' : '¡Game Over! 💀',
            html: `
                <p>${won ? 'Has destruido todos los objetivos.' : 'El tiempo se ha agotado.'}</p>
                <p>Puntuación final: ${score} puntos</p>
                ${!won ? `
                    <div style="margin: 15px 0;">
                        <h4>Top Jugadores</h4>
                        ${this.rankings.getRankingsHTML(3)}
                    </div>
                ` : ''}
            `,
            icon: won ? 'success' : 'error',
            confirmButtonText: 'Reiniciar (ENTER)',
            cancelButtonText: 'Ver rankings (ESC)',
            background: '#222',
            color: '#fff',
            allowEscapeKey: true,
            allowEnterKey: true,
            showCancelButton: true,
            focusConfirm: false,
            showCloseButton: false
        }).then((result) => {
            result.isDismissed ? this.showRankings() : location.reload();
        });
    }

    dispose() {
        window.removeEventListener('resize', this.onWindowResize);
        this.renderer.dispose();
        if (this.gameWorld) this.gameWorld.dispose();
        if (this.player) this.player.dispose();
    }
}