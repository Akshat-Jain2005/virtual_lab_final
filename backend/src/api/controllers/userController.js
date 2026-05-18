/**
 * api/controllers/userController.js - User Authentication and Management
 */

const User = require('../../models/User');
const { signAccessToken, signRefreshToken, verifyToken } = require('../../auth/jwtService');
const logger = require('../../utils/logger');

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { email, password, username, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const user = new User({ email, password, username, role });
    await user.save();

    logger.info(`User registered: ${email}`);
    res.status(201).json({ message: 'User created successfully', userId: user._id });
  } catch (err) {
    logger.error('Registration error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email, isDeleted: false });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    user.lastLogin = new Date();
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
};

/**
 * Refresh tokens
 */
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    const decoded = verifyToken(refreshToken, true);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.isDeleted) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const newAccessToken = signAccessToken(user);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

/**
 * Get user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};