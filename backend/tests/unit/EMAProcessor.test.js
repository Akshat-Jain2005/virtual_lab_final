const EMAProcessor = require('../../src/analytics/EMAProcessor');

describe('EMAProcessor', () => {
  let processor;

  beforeEach(() => {
    processor = new EMAProcessor(0.5); 
  });

  it('should compute smoothed velocity and KE', () => {
    const bodyId = 'test-body';
    
    
    const firstData = {
      velocity: { x: 10, y: 0 },
      mass: 1
    };
    
    const firstResult = processor.process(bodyId, firstData);
    expect(firstResult.smoothedVelocity).toBe(10);
    expect(firstResult.smoothedKE).toBe(50); 

    
    
    
    
    const secondData = {
      velocity: { x: 20, y: 0 },
      mass: 1
    };
    
    const secondResult = processor.process(bodyId, secondData);
    expect(secondResult.smoothedVelocity).toBe(15);
    expect(secondResult.smoothedKE).toBe(125);
  });
});
