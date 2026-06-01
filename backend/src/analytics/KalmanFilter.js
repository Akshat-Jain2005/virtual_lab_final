
class KalmanFilter {
    constructor(R = 0.01, Q = 0.1, A = 1, C = 1) {
    this.R = R; 
    this.Q = Q; 
    this.A = A;
    this.C = C;

    this.x = NaN; 
    this.P = 1;   
  }

    filter(z) {
    if (isNaN(this.x)) {
      this.x = (1 / this.C) * z;
      return this.x;
    }

    
    this.x = this.A * this.x;
    this.P = this.A * this.P * this.A + this.R;

    
    const K = this.P * this.C * (1 / (this.C * this.P * this.C + this.Q)); 
    this.x = this.x + K * (z - this.C * this.x);
    this.P = (1 - K * this.C) * this.P;

    return this.x;
  }
}

module.exports = KalmanFilter;
