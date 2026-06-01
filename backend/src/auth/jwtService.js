

require('dotenv').config();

const jwt = require('jsonwebtoken');


const ACCESS_SECRET = process.env.SECRET_KEY || 'default_super_secure_plasma_violet_32_chars_long_key';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'default_super_secure_cosmic_refresh_32_chars_long_key';


const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  if (!process.env.SECRET_KEY || process.env.SECRET_KEY.length < 32) {
    throw new Error('FATAL: In production, SECRET_KEY environment variable is required and must be at least 32 characters long.');
  }
  if (!process.env.REFRESH_SECRET || process.env.REFRESH_SECRET.length < 32) {
    throw new Error('FATAL: In production, REFRESH_SECRET environment variable is required and must be at least 32 characters long.');
  }
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function signAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role, email: user.email },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

function verifyToken(token, isRefresh = false) {
  const secret = isRefresh ? REFRESH_SECRET : ACCESS_SECRET;
  return jwt.verify(token, secret);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyToken
};
