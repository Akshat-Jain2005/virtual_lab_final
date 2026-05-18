/**
 * api/RoomManager.js - Centralized room state and access control
 */

class RoomManager {
  constructor() {
    this.rooms = new Map(); // Map<roomId, {creatorId, users[], createdAt, settings}>
    this.userRooms = new Map(); // Map<userId, roomIds[]> for quick lookup
  }

  /**
   * Create a new room
   */
  createRoom(roomId, userId, settings = {}) {
    const room = {
      id: roomId,
      creatorId: userId,
      users: [userId],
      createdAt: Date.now(),
      settings: {
        physics: { gravity: 9.81, ...settings.physics },
        ...settings,
      },
    };
    
    this.rooms.set(roomId, room);
    
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, []);
    }
    this.userRooms.get(userId).push(roomId);
    
    return room;
  }

  /**
   * Join user to room
   */
  joinRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    if (!room.users.includes(userId)) {
      room.users.push(userId);
    }
    
    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, []);
    }
    if (!this.userRooms.get(userId).includes(roomId)) {
      this.userRooms.get(userId).push(roomId);
    }
    
    return true;
  }

  /**
   * Remove user from room
   */
  leaveRoom(roomId, userId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    const idx = room.users.indexOf(userId);
    if (idx !== -1) {
      room.users.splice(idx, 1);
    }
    
    const userRoomList = this.userRooms.get(userId);
    if (userRoomList) {
      const idx = userRoomList.indexOf(roomId);
      if (idx !== -1) {
        userRoomList.splice(idx, 1);
      }
    }
    
    return room.users.length === 0; // Return true if room now empty
  }

  /**
   * Delete a room
   */
  deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    for (const userId of room.users) {
      const userRoomList = this.userRooms.get(userId);
      if (userRoomList) {
        const idx = userRoomList.indexOf(roomId);
        if (idx !== -1) {
          userRoomList.splice(idx, 1);
        }
      }
    }
    
    this.rooms.delete(roomId);
  }

  /**
   * Check if user can access room
   */
  canUserAccessRoom(roomId, userId, userRole) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    
    // Creator always has access
    if (room.creatorId === userId) return true;
    
    // Users in the room have access
    if (room.users.includes(userId)) return true;
    
    // Admin/instructor role can access any room (optional policy)
    if (['admin', 'instructor'].includes(userRole)) return true;
    
    return false;
  }

  /**
   * Get room details
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  /**
   * Get user's rooms
   */
  getUserRooms(userId) {
    return this.userRooms.get(userId) || [];
  }

  /**
   * Get all active rooms
   */
  getAllRooms() {
    return Array.from(this.rooms.values());
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      totalRooms: this.rooms.size,
      totalUsers: this.userRooms.size,
      averageUsersPerRoom: this.rooms.size > 0 
        ? Array.from(this.rooms.values()).reduce((sum, r) => sum + r.users.length, 0) / this.rooms.size
        : 0,
    };
  }
}

module.exports = RoomManager;
