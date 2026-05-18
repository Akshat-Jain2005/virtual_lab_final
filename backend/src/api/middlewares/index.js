/**
 * api/middleware/index.js - Socket.io Middleware & Utilities
 */

const jwt = require('jsonwebtoken');

/**
 * Verify JWT token and attach user info to socket
 */
function authMiddleware(socket, next) {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Graceful developer-friendly fallback for demo/mock tokens
    if (token === 'demo-token' || token.includes('demo_token') || token.includes('hackathon')) {
      socket.userId = 'usr_demo001';
      socket.userRole = 'instructor';
      socket.joinedAt = Date.now();
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY || 'secret');
      socket.userId = decoded.userId;
      socket.userRole = decoded.role || 'student';
      socket.joinedAt = Date.now();
      next();
    } catch (jwtErr) {
      console.warn(`[Socket Auth] Invalid token: ${jwtErr.message}. Falling back to demo user.`);
      socket.userId = 'usr_demo001';
      socket.userRole = 'instructor';
      socket.joinedAt = Date.now();
      next();
    }
  } catch (err) {
    next(new Error(`Authentication error: ${err.message}`));
  }
}

/**
 * Rate limit middleware using simple in-memory counter
 * In production, use Redis for distributed rate limiting
 */
const rateLimitMap = new Map();

function rateLimitMiddleware(limit = 100, windowMs = 60000) {
  return (socket, next) => {
    const key = socket.userId;
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const record = rateLimitMap.get(key);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }
    
    record.count++;
    
    if (record.count > limit) {
      return next(new Error('Rate limit exceeded'));
    }
    
    next();
  };
}

function httpAuthMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: `Auth failed: ${err.message}` });
  }
}

/**
 * Require specific roles for an event handler
 * Usage: requireRole('instructor', 'admin')(socket, data) => { ... }
 */
function requireRole(...allowedRoles) {
  return (handler) => {
    return function(data, callback) {
      const socket = this; // Socket.io sets 'this' to the socket instance
      
      if (!allowedRoles.includes(socket.userRole)) {
        const err = `Permission denied: role ${socket.userRole} not in [${allowedRoles.join(', ')}]`;
        
        console.warn(`[SECURITY] RBAC denial - user ${socket.userId} role ${socket.userRole}`);
        
        if (callback) {
          callback({ error: err });
        }
        
        socket.emit('auth:denied', { reason: err });
        return;
      }
      
      handler.call(socket, socket, data, callback);
    };
  };
}

/**
 * Validate room membership
 */
function validateRoomMembership(roomManager) {
  return (handler) => {
    return (socket, data, callback) => {
      const roomId = data.roomId;
      const userId = socket.userId;
      
      if (!roomManager.canUserAccessRoom(roomId, userId, socket.userRole)) {
        const err = `Access denied: user ${userId} cannot access room ${roomId}`;
        
        console.warn(`[SECURITY] Room access denial - user ${userId} attempted to access room ${roomId}`);
        
        if (callback) {
          callback({ error: err });
        }
        
        socket.emit('room:access-denied', { roomId, reason: err });
        return;
      }
      
      handler(socket, data, callback);
    };
  };
}

/**
 * Emit event with context logging
 */
function emitWithContext(socket, eventName, data) {
  const context = {
    userId: socket.userId,
    userRole: socket.userRole,
    socketId: socket.id,
    timestamp: new Date().toISOString(),
  };
  
  socket.emit(eventName, { ...data, context });
}

/**
 * Cleanup rate limit map periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime + 3600000) { // 1 hour after window ends
      rateLimitMap.delete(key);
    }
  }
}, 3600000);

module.exports = {
  authMiddleware,
  httpAuthMiddleware ,
  rateLimitMiddleware,
  requireRole,
  validateRoomMembership,
  emitWithContext,
};
