/**
 * auth/jwtService.js - Centralized JWT Management
 */

const jwt = require('jsonwebtoken');

// Security Hardening: Ensure secrets are present and strong
const ACCESS_SECRET = process.env.SECRET_KEY;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!ACCESS_SECRET || ACCESS_SECRET.length < 32) {
  throw new Error('FATAL: SECRET_KEY environment variable is required and must be at least 32 characters long.');
}

if (!REFRESH_SECRET || REFRESH_SECRET.length < 32) {
  throw new Error('FATAL: REFRESH_SECRET environment variable is required and must be at least 32 characters long.');
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

/**
 * Sign an access token
 */
function signAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role, email: user.email },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

/**
 * Sign a refresh token
 */
function signRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

/**
 * Verify a token
 */
function verifyToken(token, isRefresh = false) {
  const secret = isRefresh ? REFRESH_SECRET : ACCESS_SECRET;
  return jwt.verify(token, secret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken
};
