/**
 * analytics/EMAProcessor.js - Exponential Moving Average and Kinetic Energy computation
 */

class EMAProcessor {
  constructor(alpha = 0.15) {
    this.alpha = alpha;
    this.state = new Map(); // Map<bodyId, {emaVelocity, emaKE, emaPE}>
  }

  /**
   * Process a body's state and update smoothed values
   * @param {string} bodyId 
   * @param {Object} currentData - {velocity, mass, position}
   */
  process(bodyId, currentData) {
    const { x, y } = currentData.velocity || { x: 0, y: 0 };
    const mass = currentData.mass || 1;
    const posY = currentData.position?.y ?? 300;
    
    // Magnitude of velocity
    const magnitude = Math.sqrt(x * x + y * y);
    
    // Height and Potential Energy (matching frontend usePhysicsAnalytics formula)
    const h = Math.max(0, 600 - posY);
    const ke = 0.5 * mass * (magnitude * magnitude) * 500;
    const pe = mass * 9.81 * h * 0.5;

    let bodyState = this.state.get(bodyId);
    if (!bodyState) {
      bodyState = {
        smoothedVelocity: magnitude,
        smoothedKE: ke,
        smoothedPE: pe,
        vx: x,
        vy: y
      };
      this.state.set(bodyId, bodyState);
      return bodyState;
    }

    // EMA Smoothing: S_t = αY_t + (1−α)S_{t-1}
    bodyState.smoothedVelocity = (this.alpha * magnitude) + (1 - this.alpha) * bodyState.smoothedVelocity;
    bodyState.smoothedKE = (this.alpha * ke) + (1 - this.alpha) * bodyState.smoothedKE;
    bodyState.smoothedPE = (this.alpha * pe) + (1 - this.alpha) * bodyState.smoothedPE;
    bodyState.vx = x;
    bodyState.vy = y;

    return bodyState;
  }

  getSmoothedState(bodyId) {
    return this.state.get(bodyId);
  }
}

module.exports = EMAProcessor;
