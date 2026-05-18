/**
 * physics/plugins/FluidDragPlugin.js - Implements air/water resistance (Drag Force)
 * Formula: Fd = -½ * ρ * v² * Cd * A
 */

const { Body } = require('matter-js');

class FluidDragPlugin {
  constructor(options = {}) {
    this.density = options.density || 0.001; // Fluid density
    this.dragCoefficient = options.dragCoefficient || 0.5; // Drag coefficient
  }

  preUpdate(engine, deltaMs) {
    engine.bodies.forEach(body => {
      if (body.isStatic) return;

      const velocity = body.velocity;
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      
      if (speed < 0.01) return;

      // Drag magnitude
      const dragMagnitude = 0.5 * this.density * (speed * speed) * this.dragCoefficient;
      
      // Drag direction (opposite to velocity)
      const force = {
        x: -(velocity.x / speed) * dragMagnitude,
        y: -(velocity.y / speed) * dragMagnitude
      };

      Body.applyForce(body, body.position, force);
    });
  }
}

module.exports = FluidDragPlugin;
