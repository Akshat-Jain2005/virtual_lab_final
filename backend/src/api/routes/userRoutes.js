const express = require('express');
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middlewares');
const { httpAuthMiddleware } = require('../middlewares');

const router = express.Router();

// Public routes
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/refresh', userController.refresh);

// Protected routes
router.get('/profile', httpAuthMiddleware, userController.getProfile);

module.exports = router;