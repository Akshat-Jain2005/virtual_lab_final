/**
 * types/index.js - JSDoc Type Definitions for the Virtual Lab project
 */

/**
 * @typedef {Object} Vector2
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} PhysicsBody
 * @property {string} id
 * @property {Vector2} position
 * @property {Vector2} velocity
 * @property {number} angle
 * @property {number} angularVelocity
 * @property {number} [mass]
 */

/**
 * @typedef {Object} AnalyticsFrame
 * @property {string} roomId
 * @property {number} timestamp
 * @property {Array<{id: string, smoothedVelocity: number, smoothedKE: number}>} bodies
 */

/**
 * @typedef {Object} LockEntry
 * @property {string} roomId
 * @property {string} objectId
 * @property {string} userId
 * @property {number} expiry
 */

/**
 * @typedef {Object} WorkerMessage
 * @property {string} type
 * @property {Object} [data]
 */

module.exports = {};
