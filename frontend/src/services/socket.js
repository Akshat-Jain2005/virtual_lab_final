/**
 * socket.js — Virtual Lab Socket.io Client
 *
 * Architecture: single shared socket instance, lazy-initialized on first connect.
 * All emitters include a graceful offline fallback for demo mode.
 *
 * Wired events (console-logging until real backend is ready):
 *   physics:delta   — server-authoritative world delta
 *   room:peers      — current peer list
 *   peer:cursor     — other users' cursor positions
 */

import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || ''

let socket = null

// ─── Connect ─────────────────────────────────────────────────────────────────

export function connectSocket(token) {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth:       { token },
    transports: ['websocket', 'polling'],
    reconnection:         true,
    reconnectionAttempts: 5,
    reconnectionDelay:    1000,
    timeout:              8000,
  })

  socket.on('connect', () => {
    console.log('[Socket] ✅ Connected:', socket.id)
  })

  socket.on('connect_error', (err) => {
    console.warn('[Socket] ⚠️  Connection error (demo mode active):', err.message)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] 🔌 Disconnected:', reason)
  })

  // ── Physics: server-authoritative world delta ──────────────────────────────
  // Payload: { roomId, seq, ts, bodies: [{ id, x, y, angle, vx, vy, va }] }
  socket.on('physics:delta', (payload) => {
    // Dispatch to any registered reconcile handler (set by RoomPage)
    if (typeof socket._onPhysicsDelta === 'function') {
      socket._onPhysicsDelta(payload)
    }
  })

  // ── Room: peer roster update ──────────────────────────────────────────────
  // Payload: { roomId, peers: [{ userId, username, color, cursor, isOnline }] }
  socket.on('room:peers', (payload) => {
    if (typeof socket._onRoomPeers === 'function') {
      socket._onRoomPeers(payload)
    }
  })

  // ── Peer: cursor position stream ──────────────────────────────────────────
  // Payload: { userId, username, color, position: { x, y } }
  socket.on('peer:cursor', (payload) => {
    if (typeof socket._onPeerCursor === 'function') {
      socket._onPeerCursor(payload)
    }
  })

  socket.on('body:confirmed',          (p) => console.log('[Socket] ✔️  body:confirmed',          p.bodyId))
  socket.on('physics:body-grabbed',    (p) => console.log('[Socket] 🤝 physics:body-grabbed',    p))
  socket.on('physics:body-released',   (p) => console.log('[Socket] 🤚 physics:body-released',   p))
  socket.on('simulation:state',        (p) => console.log('[Socket] 🎮 simulation:state',        p.state))
  socket.on('chat:message',            (p) => console.log('[Socket] 💬 chat:message',            p.username, p.text))

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function getSocket()    { return socket }
export function isConnected()  { return socket?.connected ?? false }

// ─── Emitters ─────────────────────────────────────────────────────────────────

function safeEmit(event, payload, callback) {
  if (!socket?.connected) {
    console.warn(`[Socket] Offline — skipping emit: ${event}`)
    callback?.({ success: false, offline: true })
    return
  }
  socket.emit(event, payload, callback)
}

export function emitRoomJoin(roomId, seqId, callback) {
  if (!socket?.connected) {
    setTimeout(() => callback?.({ success: true, roomId, offline: true }), 200)
    return
  }
  socket.emit('room:join', { roomId, seqId }, callback)
}

export function emitRoomCreate(settings, seqId, callback) {
  if (!socket?.connected) {
    const roomId = `room-${Date.now()}`
    setTimeout(() => callback?.({ success: true, roomId, offline: true }), 300)
    return
  }
  socket.emit('room:create', { settings, seqId }, callback)
}

export function emitRoomLeave(roomId, callback)                                    { safeEmit('room:leave',      { roomId }, callback) }
export function emitBodyGrab(roomId, bodyId, position, velocity, seqId, callback) { safeEmit('physics:grab',    { roomId, bodyId, position, velocity, seqId }, callback) }
export function emitBodyRelease(roomId, bodyId, seqId, callback)                  { safeEmit('physics:release', { roomId, bodyId, seqId }, callback) }
export function emitCursorMove(roomId, position)                                   { socket?.volatile.emit('cursor:move', { roomId, position }) }
export function emitSimPlay(roomId)                                                { safeEmit('simulation:play',   { roomId }) }
export function emitSimPause(roomId)                                               { safeEmit('simulation:pause',  { roomId }) }
export function emitSimReset(roomId)                                               { safeEmit('simulation:reset',  { roomId }) }
export function emitExperimentSave(roomId, name, state, seqId, callback)          { safeEmit('experiment:save',   { roomId, name, state, seqId }, callback) }
export function emitChatMessage(roomId, text, callback)                            { safeEmit('chat:send',         { roomId, text }, callback) }

// ─── Listener exports ────────────────────────────────────────────────────────

export const onPhysicsDelta  = (cb) => socket?.on('physics:delta',        cb)
export const onRoomPeers     = (cb) => socket?.on('room:peers',           cb)
export const onPeerCursor    = (cb) => socket?.on('peer:cursor',          cb)
export const onBodyConfirmed = (cb) => socket?.on('body:confirmed',       cb)
export const onSimState      = (cb) => socket?.on('simulation:state',     cb)
export const onChatMessage   = (cb) => socket?.on('chat:message',         cb)
export const onPeerGrabbed   = (cb) => socket?.on('physics:body-grabbed', cb)
export const onPeerReleased  = (cb) => socket?.on('physics:body-released',cb)

export function offAll() {
  [
    'room:state','room:peers','room:user-joined','room:user-left',
    'peer:cursor','physics:delta','body:confirmed',
    'physics:body-grabbed','physics:body-released',
    'simulation:state','chat:message',
  ].forEach(ev => socket?.off(ev))
}

// ─── Delta reconciliation registration ────────────────────────────────────────
// Called by RoomPage to hook the delta stream into the live Matter.js engine.
export function registerPhysicsDeltaHandler(handler) {
  if (socket) socket._onPhysicsDelta = handler
}
export function registerRoomPeersHandler(handler) {
  if (socket) socket._onRoomPeers = handler
}
export function registerPeerCursorHandler(handler) {
  if (socket) socket._onPeerCursor = handler
}

/**
 * reconcileWorldWithDelta(engine, payload)
 *
 * Applies a server physics delta to the local Matter.js world.
 * Uses a "soft reconcile" approach: we nudge bodies towards the server
 * positions rather than teleporting them, which avoids visual glitches
 * when the local simulation is slightly ahead.
 *
 * payload.bodies: Array<{ id: number, x, y, angle, vx, vy }>
 */
export function reconcileWorldWithDelta(engine, payload) {
  if (!engine?.world || !payload?.bodies?.length) return

  const Matter = window.Matter
  if (!Matter) return

  const { Composite, Body } = Matter
  const all = Composite.allBodies(engine.world)

  payload.bodies.forEach(serverBody => {
    const local = all.find(b => b.id === serverBody.id)
    if (!local || local.isStatic) return

    // Soft position correction — lerp 30% toward server position
    const LERP = 0.3
    const tx = local.position.x + (serverBody.x - local.position.x) * LERP
    const ty = local.position.y + (serverBody.y - local.position.y) * LERP
    Body.setPosition(local, { x: tx, y: ty })

    // Hard-correct velocity so energy is consistent
    Body.setVelocity(local, { x: serverBody.vx ?? local.velocity.x, y: serverBody.vy ?? local.velocity.y })
  })
}
