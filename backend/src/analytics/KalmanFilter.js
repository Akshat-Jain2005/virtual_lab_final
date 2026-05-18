/**
 * analytics/KalmanFilter.js - 1D Kalman Filter for noise reduction
 */

class KalmanFilter {
  /**
   * @param {number} R - Process noise covariance (usually small, e.g., 0.01)
   * @param {number} Q - Measurement noise covariance (usually larger, e.g., 0.1)
   * @param {number} A - State transition matrix
   * @param {number} C - Measurement matrix
   */
  constructor(R = 0.01, Q = 0.1, A = 1, C = 1) {
    this.R = R; // Process noise
    this.Q = Q; // Measurement noise
    this.A = A;
    this.C = C;

    this.x = NaN; // State estimate
    this.P = 1;   // Estimation error covariance
  }

  /**
   * Filter a new measurement
   * @param {number} z - Measurement
   */
  filter(z) {
    if (isNaN(this.x)) {
      this.x = (1 / this.C) * z;
      return this.x;
    }

    // Prediction
    this.x = this.A * this.x;
    this.P = this.A * this.P * this.A + this.R;

    // Correction (Measurement Update)
    const K = this.P * this.C * (1 / (this.C * this.P * this.C + this.Q)); // Kalman Gain
    this.x = this.x + K * (z - this.C * this.x);
    this.P = (1 - K * this.C) * this.P;

    return this.x;
  }
}

module.exports = KalmanFilter;
