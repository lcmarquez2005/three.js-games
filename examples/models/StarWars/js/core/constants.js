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
// Configuración de bolas de fuego
export const FIREBALL_CONFIG = {
    LIFETIME: 2000,        // 2 segundos en ms
    FADE_START: 1500,      // Comienza a desvanecer a los 1.5 segundos
    FADE_DURATION: 500,    // Duración del desvanecimiento en ms
    IMPULSE_BASE: 15,      // Fuerza base del lanzamiento
    IMPULSE_MULTIPLIER: 30,// Multiplicador de fuerza adicional
    BOUNCE_FACTOR: 1.5,    // Factor de rebote
    DAMPING_FACTOR: 1.5    // Factor de amortiguación
};

export const BALL_CONFIG = {
    // ... otras constantes de bola si las necesitas ...
};
// constants.js


// Configuración del jugador
export const PLAYER_CONFIG = {
    RADIUS: 0.5,
    SPEED: 5,
    JUMP_FORCE: 15
};

export const ANIMATION_FILES = {
    idle: './animations/Idle.glb',
    walk: './animations/Walking.glb',
    run: './animations/Running.glb',
    jump: './animations/jump.glb',
    fall: './animations/fall.glb'
}

// Configuración física
export const PHYSICS_CONFIG = {
    COLLISION_THRESHOLD: 0.01,
    VELOCITY_EPSILON: 0.001
};

// Rutas de texturas
export const TEXTURE_PATHS = {
    FIREBALL: 'textures/fireball.png',
    // Agrega otras texturas aquí
};

// Configuración de renderizado
export const RENDER_SETTINGS = {
    SHADOW_MAP_SIZE: 2048
};