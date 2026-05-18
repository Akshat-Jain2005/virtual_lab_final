/**
 * api/handlers.js - Socket.io event handlers
 */

const { getInstance: getWorkerPool } = require("../../workers/WorkerPool");
const RoomManager = require("../RoomManager");
const {
  requireRole,
  validateRoomMembership,
  emitWithContext,
} = require("../../api/middlewares");
const sequenceTracker = require("../../utils/SequenceTracker");
const auditLogWriter = require("../../utils/AuditLogWriter");
const lockManager = require("../../redis/lockManager");

const roomManager = new RoomManager();

// Room-to-Socket.io namespace mapping
// In production, use Socket.io rooms directly
const roomSockets = new Map(); // Map<roomId, Set<socketId>>

// Physics tick timer
let physicsTickInterval = null;
const PHYSICS_TICK_MS = 1000 / 60; // 60 Hz

function initializeHandlers(io) {
  const workerPool = getWorkerPool()

  // ── CRITICAL: give the worker pool a socket.io reference so it can
  // broadcast physics:delta events to room members as they arrive from
  // the physics worker threads.
  workerPool.setIo(io)

  io.on("connection", (socket) => {
    console.log(
      `[CONNECT] User ${socket.userId} connected (socket: ${socket.id})`,
    );

    // ============ Room Lifecycle ============

    /**
     * Create a new room
     */
    socket.on("room:create", (data, callback) => {
      try {
        // Validate sequence ID (anti-replay)
        if (
          data.seqId &&
          !sequenceTracker.validateAndUpdate(socket.userId, data.seqId)
        ) {
          auditLogWriter.log({
            userId: socket.userId,
            action: "room:create",
            status: "denied",
            reason: "sequence_replay_detected",
            ipAddress: socket.handshake.address,
          });
          return callback({
            success: false,
            error: "Sequence validation failed",
          });
        }

        const roomId =
          data.roomId ||
          `room-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const room = roomManager.createRoom(
          roomId,
          socket.userId,
          data.settings || {},
        );

        // Spawn physics worker
        getWorkerPool()
          .spawn(roomId)
          .then((result) => {
            console.log(
              `[ROOM_CREATE] Room ${roomId} created, assigned to worker ${result.workerId}`,
            );

            socket.join(roomId);
            if (!roomSockets.has(roomId)) {
              roomSockets.set(roomId, new Set());
            }
            roomSockets.get(roomId).add(socket.id);

            io.to(roomId).emit("room:created", {
              roomId,
              creatorId: socket.userId,
            });

            // Log successful room creation
            auditLogWriter.log({
              userId: socket.userId,
              action: "room:create",
              roomId,
              status: "success",
              metadata: { workerId: result.workerId },
              ipAddress: socket.handshake.address,
            });

            callback({ success: true, roomId });
          })
          .catch((err) => {
            console.error(
              `[ROOM_CREATE_ERROR] Failed to create room ${roomId}:`,
              err,
            );

            // Log error
            auditLogWriter.log({
              userId: socket.userId,
              action: "room:create",
              roomId,
              status: "error",
              reason: err.message,
              ipAddress: socket.handshake.address,
            });

            callback({ success: false, error: err.message });
          });
      } catch (err) {
        console.error("[ROOM_CREATE_ERROR]", err);
        callback({ success: false, error: err.message });
      }
    });

    /**
     * Join an existing room
     */
    socket.on("room:join", (data, callback) => {
      try {
        // Validate sequence ID
        if (
          data.seqId &&
          !sequenceTracker.validateAndUpdate(socket.userId, data.seqId)
        ) {
          auditLogWriter.log({
            userId: socket.userId,
            action: "user:join",
            roomId: data.roomId,
            status: "denied",
            reason: "sequence_replay_detected",
            ipAddress: socket.handshake.address,
          });
          return callback({
            success: false,
            error: "Sequence validation failed",
          });
        }

        const roomId = data.roomId;
        let room = roomManager.getRoom(roomId);

        if (!room) {
          console.log(`[ROOM_AUTO_PROVISION] Room ${roomId} not active. Dynamic auto-provisioning initiated.`);
          room = roomManager.createRoom(
            roomId,
            socket.userId,
            data.settings || {},
          );
          
          // Spawn background physics loop worker for this room on the fly
          getWorkerPool().spawn(roomId).then(() => {
            console.log(`[ROOM_AUTO_PROVISION_SUCCESS] Physics worker spawned successfully for room: ${roomId}`);
          }).catch(err => {
            console.error(`[ROOM_AUTO_PROVISION_ERROR] Failed to spawn worker for room ${roomId}:`, err);
          });
        }

        // Check access
        if (
          !roomManager.canUserAccessRoom(roomId, socket.userId, socket.userRole)
        ) {
          console.warn(
            `[SECURITY] User ${socket.userId} denied access to room ${roomId}`,
          );

          auditLogWriter.log({
            userId: socket.userId,
            action: "user:join",
            roomId,
            status: "denied",
            reason: "access_denied",
            ipAddress: socket.handshake.address,
          });

          return callback({ success: false, error: "Access denied" });
        }

        roomManager.joinRoom(roomId, socket.userId);
        socket.join(roomId);

        if (!roomSockets.has(roomId)) {
          roomSockets.set(roomId, new Set());
        }
        roomSockets.get(roomId).add(socket.id);

        console.log(`[ROOM_JOIN] User ${socket.userId} joined room ${roomId}`);

        // Log successful join
        auditLogWriter.log({
          userId: socket.userId,
          action: "user:join",
          roomId,
          status: "success",
          ipAddress: socket.handshake.address,
        });

        io.to(roomId).emit("room:user-joined", {
          roomId,
          userId: socket.userId,
          userCount: room.users.length,
        });

        callback({ success: true, roomId, room });
      } catch (err) {
        console.error("[ROOM_JOIN_ERROR]", err);
        callback({ success: false, error: err.message });
      }
    });

    /**
     * Leave a room
     */
    socket.on("room:leave", (data, callback) => {
      try {
        const roomId = data.roomId;
        const isEmpty = roomManager.leaveRoom(roomId, socket.userId);

        socket.leave(roomId);
        const roomSocketSet = roomSockets.get(roomId);
        if (roomSocketSet) {
          roomSocketSet.delete(socket.id);
        }

        console.log(`[ROOM_LEAVE] User ${socket.userId} left room ${roomId}`);

        // Log leave event
        auditLogWriter.log({
          userId: socket.userId,
          action: "user:leave",
          roomId,
          status: "success",
          ipAddress: socket.handshake.address,
        });

        io.to(roomId).emit("room:user-left", {
          roomId,
          userId: socket.userId,
          userCount: roomManager.getRoom(roomId)?.users.length || 0,
        });

        // Clean up empty room
        if (isEmpty) {
          roomManager.deleteRoom(roomId);
          const pool = getWorkerPool();
          pool.retire(roomId);
          roomSockets.delete(roomId);
          console.log(`[ROOM_CLEANUP] Room ${roomId} cleaned up (no users)`);
        }

        callback({ success: true });
      } catch (err) {
        console.error("[ROOM_LEAVE_ERROR]", err);
        callback({ success: false, error: err.message });
      }
    });

    // ============ Physics Events ============

    socket.on("physics:grab", async (data, callback) => {
      try {
        const { roomId, bodyId, position, velocity, seqId } = data;

        // Validate sequence ID
        if (seqId && !sequenceTracker.validateAndUpdate(socket.userId, seqId)) {
          return callback({ success: false, error: "Sequence validation failed" });
        }

        if (!roomManager.canUserAccessRoom(roomId, socket.userId, socket.userRole)) {
          return callback({ success: false, error: "Access denied" });
        }

        // Acquire distributed lock
        const locked = await lockManager.acquireLock(roomId, bodyId, socket.userId);
        if (!locked) {
          return callback({ success: false, error: "Object is currently locked by another user" });
        }

        // Update authoritative worker
        getWorkerPool().sendToWorker(roomId, {
          type: "body:update",
          bodyId,
          updates: { position, velocity }
        });

        // Broadcast to all users in room
        io.to(roomId).emit("physics:body-grabbed", {
          bodyId,
          userId: socket.userId,
          position,
          velocity,
          timestamp: Date.now(),
        });

        callback({ success: true });
      } catch (err) {
        console.error("[PHYSICS_GRAB_ERROR]", err);
        callback({ success: false, error: err.message });
      }
    });

    socket.on("physics:release", async (data, callback) => {
      try {
        const { roomId, bodyId, seqId } = data;

        // Validate sequence ID
        if (seqId && !sequenceTracker.validateAndUpdate(socket.userId, seqId)) {
          return callback({ success: false, error: "Sequence validation failed" });
        }

        if (!roomManager.canUserAccessRoom(roomId, socket.userId, socket.userRole)) {
          return callback({ success: false, error: "Access denied" });
        }

        // Release distributed lock
        await lockManager.releaseLock(roomId, bodyId, socket.userId);

        io.to(roomId).emit("physics:body-released", {
          bodyId,
          userId: socket.userId,
          timestamp: Date.now(),
        });

        callback({ success: true });
      } catch (err) {
        console.error("[PHYSICS_RELEASE_ERROR]", err);
        callback({ success: false, error: err.message });
      }
    });

    // ============ Collaboration Events ============

    /**
     * Update user cursor (30Hz throttled broadcast)
     */
    socket.on("cursor:move", (data) => {
      const { roomId, position } = data;
      // Throttling is usually handled by the client, 
      // but we broadcast to others in the room
      socket.to(roomId).emit("cursor:moved", {
        userId: socket.userId,
        position,
        timestamp: Date.now()
      });
    });

    /**
     * Chat message broadcast
     */
    socket.on("chat:message", (data) => {
      const { roomId, text, username, color } = data;
      io.to(roomId).emit("chat:message-received", {
        id: `m${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId: socket.userId,
        username: username || socket.userId,
        text,
        ts: 'just now',
        color: color || '#00f5ff'
      });
    });

    // ============ Experiment Events (Instructor Only) ============

    /**
     * Rollback experiment (instructor only)
     */
    socket.on(
      "experiment:rollback",
      requireRole("instructor", "admin")((socket, data, callback) => {
        try {
          const { roomId, checkpointId, seqId } = data;

          // Validate sequence ID
          if (seqId && !sequenceTracker.validateAndUpdate(socket.userId, seqId)) {
            return callback({ success: false, error: "Sequence validation failed" });
          }

          io.to(roomId).emit("experiment:rolled-back", {
            checkpointId,
            rolledBackBy: socket.userId,
            timestamp: Date.now(),
          });

          callback({ success: true });
        } catch (err) {
          console.error("[EXPERIMENT_ROLLBACK_ERROR]", err);
          callback({ success: false, error: err.message });
        }
      })
    );

    /**
     * Save experiment state
     */
    socket.on("experiment:save", (data, callback) => {
      try {
        const { roomId, name, state, seqId } = data;

        // Validate sequence ID
        if (seqId && !sequenceTracker.validateAndUpdate(socket.userId, seqId)) {
          return callback({ success: false, error: "Sequence validation failed" });
        }

        if (
          !roomManager.canUserAccessRoom(roomId, socket.userId, socket.userRole)
        ) {
          return callback({ success: false, error: "Access denied" });
        }

        io.to(roomId).emit("experiment:saved", {
          roomId,
          savedBy: socket.userId,
          name,
          timestamp: Date.now(),
        });

        callback({ success: true });
      } catch (err) {
        console.error("[EXPERIMENT_SAVE_ERROR]", err);
        callback({ success: false, error: err.message });
      }
    });

    // ============ Cleanup ============

    socket.on("disconnect", () => {
      console.log(`[DISCONNECT] User ${socket.userId} disconnected`);

      // Leave all rooms
      const userRooms = roomManager.getUserRooms(socket.userId);
      for (const roomId of userRooms) {
        const isEmpty = roomManager.leaveRoom(roomId, socket.userId);
        const roomSocketSet = roomSockets.get(roomId);
        if (roomSocketSet) {
          roomSocketSet.delete(socket.id);
        }

        if (isEmpty) {
          roomManager.deleteRoom(roomId);
          getWorkerPool().retire(roomId);
          roomSockets.delete(roomId);
        }
      }
    });
  });

  // Start physics tick timer
  if (!physicsTickInterval) {
    physicsTickInterval = setInterval(() => {
      getWorkerPool().broadcastTick();
    }, PHYSICS_TICK_MS);
  }
}

/**
 * Get room manager (for tests and external use)
 */
function getRoomManager() {
  return roomManager;
}

module.exports = {
  initializeHandlers,
  getRoomManager,
};
