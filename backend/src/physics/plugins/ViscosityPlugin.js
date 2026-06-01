
const { Body } = require('matter-js');

class ViscosityPlugin {
  constructor(viscosity = 0.05) {
    this.viscosity = viscosity;
  }

  preUpdate(engine, deltaMs) {
    engine.bodies.forEach(body => {
      if (body.isStatic) return;

      const force = {
        x: -body.velocity.x * this.viscosity,
        y: -body.velocity.y * this.viscosity
      };

      Body.applyForce(body, body.position, force);
    });
  }
}

module.exports = ViscosityPlugin;
