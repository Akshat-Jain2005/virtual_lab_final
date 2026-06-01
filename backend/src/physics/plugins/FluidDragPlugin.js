
const { Body } = require('matter-js');

class FluidDragPlugin {
  constructor(options = {}) {
    this.density = options.density || 0.001; 
    this.dragCoefficient = options.dragCoefficient || 0.5; 
  }

  preUpdate(engine, deltaMs) {
    engine.bodies.forEach(body => {
      if (body.isStatic) return;

      const velocity = body.velocity;
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      
      if (speed < 0.01) return;

      
      const dragMagnitude = 0.5 * this.density * (speed * speed) * this.dragCoefficient;
      
      
      const force = {
        x: -(velocity.x / speed) * dragMagnitude,
        y: -(velocity.y / speed) * dragMagnitude
      };

      Body.applyForce(body, body.position, force);
    });
  }
}

module.exports = FluidDragPlugin;
