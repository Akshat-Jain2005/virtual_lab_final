/**
 * config/physics.js - Physics Engine Constants and Presets
 */

module.exports = {
  TIMESTEP: 1 / 60,
  TICK_RATE: 60,
  FIXED_DELTA_MS: 16.666667,
  MAX_SUBSTEPS: 5,
  
  PRESETS: {
    VACUUM: {
      gravity: { x: 0, y: 0, scale: 0.001 },
      friction: 0,
      frictionAir: 0,
      restitution: 1,
    },
    AIR: {
      gravity: { x: 0, y: 9.81, scale: 0.001 },
      friction: 0.1,
      frictionAir: 0.01,
      restitution: 0.5,
    },
    WATER: {
      gravity: { x: 0, y: 4.0, scale: 0.001 },
      friction: 0.5,
      frictionAir: 0.2,
      restitution: 0.2,
    }
  },

  DEFAULT_BODY: {
    density: 0.001,
    friction: 0.1,
    frictionStatic: 0.5,
    frictionAir: 0.01,
    restitution: 0,
    isStatic: false,
  }
};
