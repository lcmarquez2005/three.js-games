import { Enemy } from './Enemy.js';
import { checkCollision } from '../utils/CollisionUtils.js';

export class EnemyManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.enemies = [];
    
    // Sistema basado en probabilidades
    this.baseSpawnProbability = 0.01; // Probabilidad base por frame
    this.minSpawnInterval = 1.0; // Mínimo tiempo entre spawns (segundos)
    this.maxEnemies = 10; // Máximo de enemigos simultáneos
    this.timeSinceLastSpawn = 0;
    
    // Dificultad progresiva
    this.difficultyLevel = 1;
    this.difficultyIncreaseInterval = 30; // Aumentar dificultad cada 30 segundos
    this.timeSinceDifficultyIncrease = 0;
    
    // Patrones de spawn
    this.spawnPatterns = [
      { weight: 4, count: 1 },  // Enemigo único (más común)
      { weight: 2, count: 2 },  // Dos enemigos
      { weight: 1, count: 3 }   // Tres enemigos (menos común)
    ];
    
    // Tipos de enemigos
    this.enemyTypes = [
      { weight: 6, type: 'standard' },  // Enemigo estándar
      { weight: 3, type: 'fast' },      // Enemigo rápido
      { weight: 1, type: 'boss' }       // Enemigo poderoso
    ];
  }

  // Selecciona un elemento basado en pesos
  selectWeightedOption(options) {
    const totalWeight = options.reduce((sum, option) => sum + option.weight, 0);
    const randomValue = Math.random() * totalWeight;
    
    let cumulativeWeight = 0;
    for (const option of options) {
      cumulativeWeight += option.weight;
      if (randomValue <= cumulativeWeight) {
        return option;
      }
    }
    
    return options[0];
  }

  async spawnEnemy(type = 'standard') {
    const enemy = new Enemy(this.scene, this.player, type);
    await enemy.loadModel();
    this.enemies.push(enemy);
  }

  async update(delta) {
    this.timeSinceLastSpawn += delta;
    this.timeSinceDifficultyIncrease += delta;
    
    // Aumentar dificultad periódicamente
    if (this.timeSinceDifficultyIncrease >= this.difficultyIncreaseInterval) {
      this.difficultyLevel++;
      this.timeSinceDifficultyIncrease = 0;
      console.log(`Nivel de dificultad aumentado a ${this.difficultyLevel}`);
      
      // Ajustar parámetros de dificultad
      this.baseSpawnProbability = Math.min(0.05, 0.01 + (this.difficultyLevel * 0.005));
      this.maxEnemies = Math.min(20, 10 + (this.difficultyLevel * 2));
    }
    
    // Determinar probabilidad de spawn basada en varios factores
    let spawnProbability = this.baseSpawnProbability;
    
    // Reducir probabilidad si hay muchos enemigos
    const enemyCountFactor = 1 - (this.enemies.length / this.maxEnemies);
    spawnProbability *= enemyCountFactor;
    
    // Aumentar probabilidad si ha pasado mucho tiempo desde el último spawn
    const timeFactor = Math.min(1.5, this.timeSinceLastSpawn / this.minSpawnInterval);
    spawnProbability *= timeFactor;
    
    // Intentar generar enemigos basado en probabilidad
    if (this.enemies.length < this.maxEnemies && 
        this.timeSinceLastSpawn >= this.minSpawnInterval && 
        Math.random() < spawnProbability) {
      
      // Seleccionar patrón de spawn
      const pattern = this.selectWeightedOption(this.spawnPatterns);
      
      for (let i = 0; i < pattern.count; i++) {
        // Seleccionar tipo de enemigo
        const enemyType = this.selectWeightedOption(this.enemyTypes);
        await this.spawnEnemy(enemyType.type);
      }
      
      this.timeSinceLastSpawn = 0;
    }

    // Actualizar enemigos
    this.enemies.forEach(enemy => enemy.update(delta));

    // Colisiones entre lasers del jugador y enemigos
    this.enemies = this.enemies.filter(enemy => {
      if (!enemy.model) return false;

      for (let laser of this.player.lasers) {
        if (checkCollision(laser.mesh, enemy.model, 1)) {
          enemy.destroy();
          this.player.addScore(enemy.scoreValue); // Incrementar puntaje según tipo
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
          this.player.takeDamage(enemy.damageValue);
          return false;
        }
        return !laser.isDestroyed;
      });
    }
  }
}