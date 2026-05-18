/**
 * physics/engine/PhysicsEngine.js - Matter.js Facade with Plugin Support
 */

const { Engine, World, Body, Composite } = require('matter-js');
const { PRESETS, DEFAULT_BODY } = require('../../config/physics');

class PhysicsEngine {
  constructor(presetName = 'AIR') {
    this.engine = Engine.create();
    this.applyPreset(presetName);
    
    this.bodies = new Map(); // Map<bodyId, Body>
    this.plugins = [];
  }

  /**
   * Apply an environment preset
   */
  applyPreset(name) {
    const preset = PRESETS[name] || PRESETS.AIR;
    this.engine.gravity.x = preset.gravity.x;
    this.engine.gravity.y = preset.gravity.y;
    this.engine.gravity.scale = preset.gravity.scale;
  }

  /**
   * Add a body to the world
   */
  addBody(bodyId, config) {
    const finalConfig = { ...DEFAULT_BODY, ...config };
    const body = Body.create(finalConfig);
    body.id = bodyId;
    
    this.bodies.set(bodyId, body);
    Composite.add(this.engine.world, body);
    return body;
  }

  /**
   * Update body properties
   */
  updateBody(bodyId, updates) {
    const body = this.bodies.get(bodyId);
    if (!body) return;

    if (updates.position) Body.setPosition(body, updates.position);
    if (updates.velocity) Body.setVelocity(body, updates.velocity);
    if (updates.angle !== undefined) Body.setAngle(body, updates.angle);
    if (updates.force) Body.applyForce(body, body.position, updates.force);
  }

  /**
   * Remove body
   */
  removeBody(bodyId) {
    const body = this.bodies.get(bodyId);
    if (body) {
      Composite.remove(this.engine.world, body);
      this.bodies.delete(bodyId);
    }
  }

  /**
   * Run one engine update
   */
  update(deltaMs) {
    // Run pre-update plugins
    this.plugins.forEach(p => p.preUpdate && p.preUpdate(this, deltaMs));
    
    Engine.update(this.engine, deltaMs);
    
    // Run post-update plugins
    this.plugins.forEach(p => p.postUpdate && p.postUpdate(this, deltaMs));
  }

  /**
   * Get serializable state
   */
  getState() {
    const state = [];
    this.bodies.forEach((body, id) => {
      state.push({
        id,
        position: { x: body.position.x, y: body.position.y },
        velocity: { x: body.velocity.x, y: body.velocity.y },
        angle: body.angle,
        angularVelocity: body.angularVelocity
      });
    });
    return state;
  }

  registerPlugin(plugin) {
    this.plugins.push(plugin);
  }
}

module.exports = PhysicsEngine;
