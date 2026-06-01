const KalmanFilter = require('../../src/analytics/KalmanFilter');

describe('KalmanFilter', () => {
  it('should reduce noise from measurements', () => {
    const filter = new KalmanFilter(0.1, 1); 
    const targetValue = 100;
    
    let lastValue = 0;
    for (let i = 0; i < 50; i++) {
      
      const noise = (Math.random() - 0.5) * 10;
      lastValue = filter.filter(targetValue + noise);
    }

    
    expect(lastValue).toBeGreaterThan(95);
    expect(lastValue).toBeLessThan(105);
  });

  it('should initialize with first measurement', () => {
    const filter = new KalmanFilter();
    const result = filter.filter(42);
    expect(result).toBe(42);
  });
});
