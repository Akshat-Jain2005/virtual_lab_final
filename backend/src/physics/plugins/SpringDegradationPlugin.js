/**
 * physics/plugins/SpringDegradationPlugin.js - Implements material fatigue/degradation
 */

class SpringDegradationPlugin {
  constructor(degradationRate = 0.0001) {
    this.degradationRate = degradationRate;
  }

  postUpdate(engine, deltaMs) {
    // This plugin would typically iterate over constraints (springs)
    // and reduce their stiffness over time if they are under stress.
    // Matter.js constraints are stored in engine.world.constraints
    const constraints = engine.engine.world.constraints;
    
    constraints.forEach(constraint => {
      if (constraint.label === 'degradable') {
        constraint.stiffness = Math.max(0, constraint.stiffness - this.degradationRate);
      }
    });
  }
}

module.exports = SpringDegradationPlugin;
