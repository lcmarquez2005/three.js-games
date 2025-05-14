import { Enemy } from './Enemy.js';
import { checkCollision } from '../utils/CollisionUtils.js';

export class EnemyManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.enemies = [];
    this.spawnInterval = 3; // segundos entre spawns
    this.spawnTimer = 0;
  }

  async spawnEnemy() {
    const enemy = new Enemy(this.scene, this.player);
    await enemy.loadModel();
    this.enemies.push(enemy);
  }

  async update(delta) {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      await this.spawnEnemy();
      this.spawnTimer = 0;
    }

    // Actualizar enemigos
    this.enemies.forEach(enemy => enemy.update(delta));

    // Colisiones entre lasers del jugador y enemigos
    this.enemies = this.enemies.filter(enemy => {
      if (!enemy.model) return false;

      for (let laser of this.player.lasers) {
        if (checkCollision(laser.mesh, enemy.model, 1)) {
          enemy.destroy();
          this.player.addScore(); // Incrementar puntaje
          this.spawnInterval = Math.max(1, this.spawnInterval - 0.1); // Acelerar spawn
          laser.destroy();
          this.player.lasers = this.player.lasers.filter(l => !l.isDestroyed);
          return false;
        }
      }

      return true;
    });

    // Colisiones entre lasers enemigos y el jugador
    for (let enemy of this.enemies) {
      enemy.lasers = enemy.lasers.filter(laser => {
        if (checkCollision(laser.mesh, this.player.model, 1)) {
          laser.destroy();
          // Aquí podrías restar vidas o aplicar daño
          console.log("Jugador impactado!");
          this.player.takeDamage();
          return false;
        }
        return !laser.isDestroyed;
      });
    }
  }
}
