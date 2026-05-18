const EMAProcessor = require('../../src/analytics/EMAProcessor');

describe('EMAProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new EMAProcessor(0.5); // alpha = 0.5 for simple testing
  });

  it('should compute smoothed velocity and KE', () => {
    const bodyId = 'test-body';
    
    // First measurement: 10 m/s
    const firstData = {
      velocity: { x: 10, y: 0 },
      mass: 1
    };
    
    const firstResult = processor.process(bodyId, firstData);
    expect(firstResult.smoothedVelocity).toBe(10);
    expect(firstResult.smoothedKE).toBe(50); // ½mv² = 0.5 * 1 * 100

    // Second measurement: 20 m/s
    // S_t = 0.5 * 20 + (1 - 0.5) * 10 = 10 + 5 = 15
    // KE_raw = 0.5 * 1 * 400 = 200
    // KE_smooth = 0.5 * 200 + 0.5 * 50 = 100 + 25 = 125
    const secondData = {
      velocity: { x: 20, y: 0 },
      mass: 1
    };
    
    const secondResult = processor.process(bodyId, secondData);
    expect(secondResult.smoothedVelocity).toBe(15);
    expect(secondResult.smoothedKE).toBe(125);
  });
});
