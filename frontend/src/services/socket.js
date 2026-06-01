
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

  
  
  socket.on('physics:delta', (payload) => {
    
    if (typeof socket._onPhysicsDelta === 'function') {
      socket._onPhysicsDelta(payload)
    }
  })

  
  
  socket.on('room:peers', (payload) => {
    if (typeof socket._onRoomPeers === 'function') {
      socket._onRoomPeers(payload)
    }
  })

  
  
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



export function registerPhysicsDeltaHandler(handler) {
  if (socket) socket._onPhysicsDelta = handler
}
export function registerRoomPeersHandler(handler) {
  if (socket) socket._onRoomPeers = handler
}
export function registerPeerCursorHandler(handler) {
  if (socket) socket._onPeerCursor = handler
}

export function reconcileWorldWithDelta(engine, payload) {
  if (!engine?.world || !payload?.bodies?.length) return

  const Matter = window.Matter
  if (!Matter) return

  const { Composite, Body } = Matter
  const all = Composite.allBodies(engine.world)

  payload.bodies.forEach(serverBody => {
    const local = all.find(b => b.id === serverBody.id)
    if (!local || local.isStatic) return

    
    const LERP = 0.3
    const tx = local.position.x + (serverBody.x - local.position.x) * LERP
    const ty = local.position.y + (serverBody.y - local.position.y) * LERP
    Body.setPosition(local, { x: tx, y: ty })

    
    Body.setVelocity(local, { x: serverBody.vx ?? local.velocity.x, y: serverBody.vy ?? local.velocity.y })
  })
}
