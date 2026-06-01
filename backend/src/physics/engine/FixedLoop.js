
const { FIXED_DELTA_MS, MAX_SUBSTEPS } = require('../../config/physics');

class FixedLoop {
  constructor(updateFn) {
    this.updateFn = updateFn;
    this.accumulator = 0;
    this.lastTime = 0;
  }

    step(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    let substeps = 0;
    while (this.accumulator >= FIXED_DELTA_MS && substeps < MAX_SUBSTEPS) {
      this.updateFn(FIXED_DELTA_MS);
      this.accumulator -= FIXED_DELTA_MS;
      substeps++;
    }

    const framesDropped = this.accumulator >= FIXED_DELTA_MS ? 1 : 0;

    return {
      deltaTime,
      substeps,
      framesDropped
    };
  }

  reset() {
    this.accumulator = 0;
    this.lastTime = 0;
  }
}

module.exports = FixedLoop;
