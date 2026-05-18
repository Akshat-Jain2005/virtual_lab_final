import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

// ─── Mock bodies for demo canvas ──────────────────────────
const MOCK_BODIES = [
  {
    id: 'body_001', type: 'rectangle',
    position: { x: 300, y: 300 },
    angle: 0, velocity: { x: 0, y: 0 },
    width: 80, height: 50,
    material: { mass: 5, restitution: 0.6, friction: 0.3, density: 0.002 },
    color: '#00f5ff', isStatic: false, label: 'Block A',
  },
  {
    id: 'body_002', type: 'circle',
    position: { x: 500, y: 200 },
    angle: 0, velocity: { x: -1.2, y: 0.5 },
    radius: 35,
    material: { mass: 2, restitution: 0.9, friction: 0.1, density: 0.001 },
    color: '#bf00ff', isStatic: false, label: 'Sphere B',
  },
  {
    id: 'body_003', type: 'rectangle',
    position: { x: 340, y: 540 },
    angle: 0, velocity: { x: 0, y: 0 },
    width: 600, height: 20,
    material: { mass: 0, restitution: 0.5, friction: 0.8, density: 1 },
    color: '#1e3048', isStatic: true, label: 'Ground',
  },
]

const MOCK_PEERS = [
  { id: 'usr_demo001', username: 'dr_maxwell', role: 'instructor', color: '#00f5ff', cursor: { x: 0, y: 0 }, isOnline: true },
  { id: 'usr_demo002', username: 'alice_chen',  role: 'student',    color: '#bf00ff', cursor: { x: 200, y: 150 }, isOnline: true },
  { id: 'usr_demo003', username: 'bob_taylor',  role: 'student',    color: '#39ff14', cursor: { x: 400, y: 300 }, isOnline: false },
]

const MOCK_CHAT = [
  { id: 'msg_001', userId: 'usr_demo002', username: 'alice_chen', text: 'Ready to start the pendulum experiment!', ts: Date.now() - 60000 },
  { id: 'msg_002', userId: 'usr_demo001', username: 'dr_maxwell', text: 'Great! Check the restitution coefficients first.', ts: Date.now() - 30000 },
]

// ─── Room Store ─────────────────────────────────────────────
const useRoomStore = create(
  subscribeWithSelector((set, get) => ({
    // ── Connection
    roomId:       null,
    isConnected:  false,
    isSimulating: false,
    simSpeed:     1.0,
    gravity:      { x: 0, y: 9.81 },

    // ── Entities
    bodies:      [],
    constraints: [],
    peers:       [],
    chat:        [],

    // ── Selection & Tool
    selectedBodyId: null,
    activeTool:     'select',  // select | rectangle | circle | polygon | rope | spring | pivot | motor
    activeMaterial: 'default', // default | rubber | wood | metal | ice

    // ── Sequence (anti-replay)
    seqCounter: 0,

    // ── History (undo/redo)
    history:     [],
    historyIdx:  -1,

    // ── Zoom / Pan
    zoom: 1,
    pan:  { x: 0, y: 0 },

    // ── Room lock
    isLocked: false,

    // ───────────── Actions ─────────────────────────────────

    joinRoom: (roomId) => {
      set({
        roomId,
        isConnected: true,
        bodies:      MOCK_BODIES,
        peers:       MOCK_PEERS,
        chat:        MOCK_CHAT,
        seqCounter:  1,
      })
    },

    leaveRoom: () => {
      set({
        roomId: null, isConnected: false,
        bodies: [], peers: [], chat: [], selectedBodyId: null,
      })
    },

    // Bodies
    addBody: (body) => {
      set(state => ({
        bodies: [...state.bodies, { ...body, id: `body_${Date.now()}` }],
        seqCounter: state.seqCounter + 1,
      }))
    },

    updateBody: (id, updates) => {
      set(state => ({
        bodies: state.bodies.map(b => b.id === id ? { ...b, ...updates } : b),
      }))
    },

    deleteBody: (id) => {
      set(state => ({
        bodies: state.bodies.filter(b => b.id !== id),
        selectedBodyId: state.selectedBodyId === id ? null : state.selectedBodyId,
      }))
    },

    selectBody: (id) => set({ selectedBodyId: id }),

    // Simulation controls
    play:  () => set({ isSimulating: true }),
    pause: () => set({ isSimulating: false }),
    reset: () => set({ isSimulating: false, bodies: MOCK_BODIES }),

    setGravity: (gravity) => set({ gravity }),
    setSimSpeed: (simSpeed) => set({ simSpeed }),

    // Tools
    setActiveTool:     (activeTool) =>     set({ activeTool }),
    setActiveMaterial: (activeMaterial) => set({ activeMaterial }),

    // Zoom / pan
    setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.2), 4) }),
    setPan:  (pan)  => set({ pan }),

    // Peers
    updatePeerCursor: (peerId, position) => {
      set(state => ({
        peers: state.peers.map(p => p.id === peerId ? { ...p, cursor: position } : p),
      }))
    },

    addPeer: (peer) => {
      set(state => ({
        peers: [...state.peers.filter(p => p.id !== peer.id), peer],
      }))
    },

    removePeer: (peerId) => {
      set(state => ({ peers: state.peers.filter(p => p.id !== peerId) }))
    },

    // Chat
    sendMessage: (text, user) => {
      const msg = { id: `msg_${Date.now()}`, userId: user.id, username: user.username, text, ts: Date.now() }
      set(state => ({ chat: [...state.chat, msg] }))
    },

    // Room lock
    toggleLock: () => set(state => ({ isLocked: !state.isLocked })),

    // Physics delta from server (60Hz)
    applyPhysicsDelta: (delta) => {
      set(state => ({
        bodies: state.bodies.map(b => {
          const update = delta.bodies?.find(d => d.id === b.id)
          return update ? { ...b, ...update } : b
        }),
      }))
    },

    // Next sequence ID
    nextSeq: () => {
      const seq = get().seqCounter
      set(state => ({ seqCounter: state.seqCounter + 1 }))
      return seq
    },
  }))
)

export default useRoomStore
