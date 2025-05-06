// Constantes globales del juego
export const GRAVITY = 25;
export const STEPS_PER_FRAME = 5;
export const NUM_SPHERES = 100;
export const SPHERE_RADIUS = 0.2;

// constants.js
export const TARGET_CONFIG = {
    // Geometría
    RADIUS: 0.5,
    HEIGHT: 0.1,
    RADIAL_SEGMENTS: 32,
    
    // Apariencia
    COLORS: {
        RED: 0xff0000,
        WHITE: 0xffffff,
        BLACK: 0x000000,
        RED_EMISSIVE: 0x880000
    },
    MATERIAL_PROPS: {
        METALNESS: 0,
        ROUGHNESS: 0.3,
        EMISSIVE_INTENSITY: 0
    },
    
    // Estructura
    RING_COUNT: 5,
    CENTER_RADIUS_RATIO: 0.2,
    
    // Generación
    MIN_HEIGHT: 0.5,
    MAX_HEIGHT: 3,
    AREA_SIZE: 20,
    SPAWN_OFFSET: 0.6,
    
    // Física
    COLLISION_OFFSET: 0.5,
    
    // Puntuación
    BASE_POINTS: 10,
    
    // Explosión
    PARTICLE_COUNT: 30,
    PARTICLE_SIZE: {
        MIN: 0.05,
        MAX: 0.15
    },
    EXPLOSION_STRENGTH: 5,
    EXPLOSION_DURATION: 1
};

export const BALL_CONFIG = {
    // ... otras constantes de bola si las necesitas ...
};