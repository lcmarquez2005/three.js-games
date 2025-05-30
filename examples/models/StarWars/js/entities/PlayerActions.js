import * as THREE from 'three';

export function shootLaser(player) {
    if (player.timeSinceLastShot < player.shootCooldown || !player.model) return;

    const offsets = [
        new THREE.Vector3(-0.3, 0.2, 0),
        new THREE.Vector3(0.3, 0.2, 0)
    ];

    const baseDirection = new THREE.Vector3(0, 0.2, -2).normalize();
    const direction = baseDirection.applyQuaternion(player.model.quaternion);

    offsets.forEach(offset => {
        const adjustedOffset = offset.applyQuaternion(player.model.quaternion);
        const spawnPosition = player.model.position.clone().add(adjustedOffset);
        
        player.lasers.push(new player.LaserClass(
            player.scene,
            spawnPosition,
            direction,
            player.laserConfig
        ));
    });

    player.timeSinceLastShot = 0;
}

export function takeDamage(player) {
    if (player.isInvulnerable) return;
    
    player.lives--;
    player.isInvulnerable = true;
    player.invulnerabilityTimer = 0;
    
    player.effects.createExplosion(player.model.position, {
        color: 0xff3300,
        particleCount: 150
    });
    
    Swal.fire({
        title: '¡Impacto!',
        text: `Has perdido una vida. Te quedan ${player.lives} vidas.`,
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        background: '#1a1a2e',
        color: '#ffffff',
        iconColor: '#ff4d4d'
    });
    
    if (player.lives <= 0) {
        gameOver(player);
    }
}

export function addScore(player, points = 1) {
    player.score += points;
    
    Swal.fire({
        title: '¡Punto!',
        text: `+${points} punto(s). Total: ${player.score}`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
        background: '#1a1a2e',
        color: '#ffffff',
        iconColor: '#4ade80'
    });
}

export function gameOver(player) {
    player.sound = new Audio('./js/assets/sounds/explosion.mp3');
    player.sound.volume = 0.9;
    player.sound.play();

    Swal.fire({
        title: '¡Juego Terminado!',
        html: `<h2 style="color: #f8f8f8">Puntaje final: ${player.score}</h2>`,
        icon: 'error',
        background: '#1a1a2e',
        color: '#ffffff',
        confirmButtonText: 'Volver a Jugar?',
        confirmButtonColor: '#3085d6',
        showCancelButton: true,
        cancelButtonText: 'Salir',
        cancelButtonColor: '#d33',
        backdrop: `
            rgba(0,0,0,0.8)
            url("https://i.gifer.com/7VE.gif")
            center top
            no-repeat
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        allowEnterKey: true,
        focusConfirm: true
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.reload();
        } else {
            window.close();
            setTimeout(() => {
                window.location.href = "about:blank";
            }, 500);
        }
    });
    
    if (typeof gameLoop !== 'undefined') {
        cancelAnimationFrame(gameLoop);
    }
}