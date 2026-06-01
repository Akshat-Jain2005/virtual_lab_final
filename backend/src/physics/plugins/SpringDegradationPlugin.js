
class SpringDegradationPlugin {
  constructor(degradationRate = 0.0001) {
    this.degradationRate = degradationRate;
  }

  postUpdate(engine, deltaMs) {
    
    
    
    const constraints = engine.engine.world.constraints;
    
    constraints.forEach(constraint => {
      if (constraint.label === 'degradable') {
        constraint.stiffness = Math.max(0, constraint.stiffness - this.degradationRate);
      }
    });
  }
}

module.exports = SpringDegradationPlugin;
