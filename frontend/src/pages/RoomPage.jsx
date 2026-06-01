import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BookOpen, Play, Save, X, Globe, Lock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import PhysicsCanvas, {
  spawnBody, spawnRope, spawnSpring, spawnPivot, spawnMotor, spawnPulley, clearBodies
} from '../components/canvas/PhysicsCanvas'

import CanvasToolbar from '../components/canvas/CanvasToolbar'
import CollabSidebar from '../components/canvas/CollabSidebar'
import PropertiesPanel from '../components/canvas/PropertiesPanel'
import AnalyticsPanel from '../components/canvas/AnalyticsPanel'
import LiveCursors from '../components/canvas/LiveCursors'
import AIChatBubble from '../components/canvas/AIChatBubble'
import ExperimentRecorder from '../components/canvas/ExperimentRecorder'
import BodyOwnershipOverlay from '../components/canvas/BodyOwnershipOverlay'
import { saveExperiment, serializeWorld, deserializeWorld, loadExperiment } from '../services/experimentLibrary'

import {
  connectSocket, emitRoomJoin, offAll,
  registerPhysicsDeltaHandler, registerRoomPeersHandler,
  registerPeerCursorHandler, reconcileWorldWithDelta,
  emitCursorMove, emitBodyGrab, emitBodyRelease
} from '../services/socket'
import useAuthStore from '../stores/useAuthStore'
import { MOCK_ROOMS } from '../services/api'
import LibraryPage from './LibraryPage'


const SPAWN_CONFIGS = {
  rectangle: {
    type: 'rectangle',
    fillStyle: 'rgba(0,245,255,0.18)', strokeStyle: 'rgba(0,245,255,0.8)',
    w: 80, h: 60,
  },
  circle: {
    type: 'circle',
    fillStyle: 'rgba(191,0,255,0.18)', strokeStyle: 'rgba(191,0,255,0.8)',
    radius: 36,
  },
  polygon: {
    type: 'polygon',
    fillStyle: 'rgba(57,255,20,0.18)', strokeStyle: 'rgba(57,255,20,0.8)',
    sides: 6, radius: 36,
  },
}


function StatusBar({ roomId, bodyCount, isConnected, mousePos }) {
  return (
    <div
      className="absolute bottom-4 left-1/2 z-30 glass rounded-full px-4 py-1.5 flex items-center gap-4 text-xs font-mono text-slate-500"
      style={{ transform: 'translateX(calc(-50% + 60px))' }}
    >
      <span className="flex items-center gap-1.5">
        <span className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
        {isConnected ? 'Connected' : 'Demo Mode'}
      </span>
      <span className="w-px h-3 bg-border" />
      <span>Bodies: <span className="text-slate-300">{bodyCount}</span></span>
      <span className="w-px h-3 bg-border" />
      <span>Room: <span className="text-cyan-neon">{roomId}</span></span>
      <span className="w-px h-3 bg-border" />
      <span>
        X: <span className="text-cyan-neon">{mousePos.x}</span>
        {' '}Y: <span className="text-violet-400">{mousePos.y}</span>
      </span>
      <span className="w-px h-3 bg-border" />
      <span className="text-lime-neon">60Hz</span>
    </div>
  )
}


export default function RoomPage() {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const engineRef = useRef(null)

  const [activeTool, setActiveTool] = useState('select')
  const [selectedBody, setSelectedBody] = useState(null)
  const [bodyCount, setBodyCount] = useState(3)
  const [isLocked, setIsLocked] = useState(false)
  const [socketReady, setSocketReady] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  const [engineObj, setEngineObj] = useState(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [isZeroG, setIsZeroG] = useState(false)

  
  const handleEngineReady = useCallback((eng) => {
    setEngineObj(eng)
    if (!eng) return
    const loadId = searchParams.get('load')
    if (loadId) {
      loadExperiment(eng, loadId).then(({ bodyCount: restored }) => {
        setBodyCount(restored)
        toast('Experiment loaded ✓', { icon: '⚗️', duration: 2000 })
      }).catch(e => {
        console.warn('[RoomPage] Could not load param experiment:', e)
      })
      return
    }
    
    const snapshotKey = `vlab-snapshot-${roomId}`
    const raw = localStorage.getItem(snapshotKey)
    if (raw) {
      try {
        const snap = JSON.parse(raw)
        const { bodyCount: restored } = deserializeWorld(eng, snap)
        setBodyCount(restored)
        if (snap.gravity?.y === 0) setIsZeroG(true)
        toast('Sandbox restored ✓', { icon: '♻️', duration: 2000 })
      } catch (e) {
        console.warn('[RoomPage] Could not restore snapshot:', e)
      }
    }
  }, [roomId, searchParams])

  
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSaveExperiment = useCallback(async () => {
    if (!saveName.trim()) {
      toast.error('Please enter a sandbox name')
      return
    }
    if (!engineObj) {
      toast.error('Physics engine not ready')
      return
    }

    setSaving(true)
    try {
      const result = await saveExperiment(engineObj, saveName.trim(), ['mechanics'], false)

      
      try {
        const snap = serializeWorld(engineObj)
        localStorage.setItem(`vlab-snapshot-${roomId}`, JSON.stringify(snap))
      } catch (snapErr) {
        console.warn('Could not cache raw snapshot:', snapErr)
      }

      
      const localRooms = localStorage.getItem('vlab_rooms')
      const rooms = localRooms ? JSON.parse(localRooms) : [...MOCK_ROOMS]
      const existingIdx = rooms.findIndex(r => r.id === roomId)
      if (existingIdx > -1) {
        rooms[existingIdx].name = saveName.trim()
        rooms[existingIdx].status = 'active'
        rooms[existingIdx].savedAt = new Date().toISOString()
      } else {
        rooms.unshift({
          id: roomId,
          name: saveName.trim(),
          users: 1,
          status: 'active',
          isLocked: false,
          savedAt: new Date().toISOString()
        })
      }
      localStorage.setItem('vlab_rooms', JSON.stringify(rooms))

      toast.success(
        result.offline
          ? `"${result.name}" saved locally!`
          : `"${result.name}" saved successfully!`,
        { icon: '💾' }
      )
      setShowSaveModal(false)
      setSaveName('')
    } catch (err) {
      toast.error(`Save failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }, [saveName, engineObj, roomId])

  const { user } = useAuthStore()

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = user?.token || 'demo-token'
    connectSocket(token)
    emitRoomJoin(roomId, 0, (res) => {
      if (res?.offline) {
        toast('Running in demo mode', { icon: '🔬', duration: 3000 })
      } else if (res?.success) {
        setSocketReady(true)
        toast.success(`Joined room: ${roomId}`, { icon: '🔬' })
      }
    })

    
    registerPhysicsDeltaHandler((payload) => {
      if (engineRef.current) reconcileWorldWithDelta(engineRef.current, payload)
    })

    
    registerRoomPeersHandler((payload) => {
      
      if (import.meta.env.DEV) console.log('[Room] peers update', payload.peers?.length)
    })

    
    registerPeerCursorHandler((payload) => {
      
    })
    return () => { offAll() }
  }, [roomId])

  
  useEffect(() => {
    let lastEmit = 0
    const onMove = (e) => {
      const x = Math.round(e.clientX)
      const y = Math.round(e.clientY)
      setMousePos({ x, y })

      const now = Date.now()
      if (now - lastEmit > 50) { 
        emitCursorMove(roomId, { x, y })
        lastEmit = now
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [roomId])

  
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const cx = window.innerWidth / 2 + (Math.random() - 0.5) * 200
      const cy = window.innerHeight * 0.2
      switch (e.key.toLowerCase()) {
        case 'r': handleDropSpawn('rectangle', cx, cy); setActiveTool('rectangle'); break
        case 'c': handleDropSpawn('circle', cx, cy); setActiveTool('circle'); break
        case 'p': handleDropSpawn('polygon', cx, cy); setActiveTool('polygon'); break
        case 't': handleDropSpawn('rope', cx, window.innerHeight * 0.08); setActiveTool('rope'); break
        case 's': handleDropSpawn('spring', cx, window.innerHeight * 0.12); setActiveTool('spring'); break
        case 'j': handleDropSpawn('pivot', cx, window.innerHeight * 0.3); setActiveTool('pivot'); break
        case 'm': handleDropSpawn('motor', cx, window.innerHeight * 0.4); setActiveTool('motor'); break
        case 'v': setActiveTool('select'); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) 

  
  const waitForEngine = useCallback((fn) => {
    if (engineRef.current) { fn(engineRef.current); return }
    let attempts = 0
    const interval = setInterval(() => {
      if (engineRef.current) {
        clearInterval(interval)
        fn(engineRef.current)
      } else if (++attempts > 10) {
        clearInterval(interval)
        toast.error('Physics engine not ready')
      }
    }, 100)
  }, [])

  
  const handleDropSpawn = useCallback((type, clientX, clientY) => {
    waitForEngine((engine) => {
      
      const x = clientX
      const y = clientY

      if (type === 'pivot') {
        spawnPivot(engine, x, Math.min(y, window.innerHeight * 0.6))
        setBodyCount(c => c + 2)
        toast('Pivot joint dropped ✓', { icon: '🔩', duration: 800 })
        return
      }

      if (type === 'motor') {
        spawnMotor(engine, x, Math.min(y, window.innerHeight * 0.7))
        setBodyCount(c => c + 3)
        toast('Motor dropped ✓', { icon: '⚙️', duration: 800 })
        return
      }

      if (type === 'rope') {
        spawnRope(engine, x, Math.min(y, window.innerHeight * 0.35), 26)
        setBodyCount(c => c + 26)
        toast('Rope dropped ✓', { icon: '🪢', duration: 800 })
        return
      }

      if (type === 'spring') {
        spawnSpring(engine, x, Math.min(y, window.innerHeight * 0.6))
        setBodyCount(c => c + 2)
        toast('Spring dropped ✓', { icon: '🌀', duration: 800 })
        return
      }

      if (type === 'wall') {
        const body = spawnBody(engine, 'rectangle', x, y, {
          w: 120, h: 20, isStatic: true, label: 'wall',
          fillStyle: 'rgba(255,255,255,0.22)',
          strokeStyle: 'rgba(255,255,255,0.7)',
        })
        if (body) {
          setBodyCount(c => c + 1)
          toast('Static Wall dropped ✓', { icon: '🧱', duration: 800 })
        }
        return
      }

      if (type === 'pulley') {
        spawnPulley(engine, x, y)
        setBodyCount(c => c + 3)
        toast('Mechanical Pulley dropped ✓', { icon: '⚙️', duration: 800 })
        return
      }

      const cfg = SPAWN_CONFIGS[type]
      if (!cfg) return
      const body = spawnBody(engine, cfg.type, x, y, cfg)
      if (body) {
        setBodyCount(c => c + 1)
        toast(`${cfg.type} dropped ✓`, { icon: '✨', duration: 800 })
      }
    })
  }, [waitForEngine])

  const handleClear = useCallback(() => {
    if (engineRef.current) {
      clearBodies(engineRef.current)
      setBodyCount(0)
      setSelectedBody(null)
      toast('Canvas cleared', { icon: '🗑', duration: 1000 })
    }
  }, [])

  const handleZeroG = useCallback(() => {
    if (engineRef.current) {
      clearBodies(engineRef.current)
      setBodyCount(0)
      setSelectedBody(null)
      engineRef.current.gravity.y = 0
      engineRef.current.gravity.x = 0
      setIsZeroG(true)
      toast('Zero-G Workspace initialized 🚀', {
        description: 'Gravity is set to 0. Assemble your pulley/joints now!',
        icon: '🚀',
        duration: 3000,
      })
    }
  }, [])

  const handleApplyGravity = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.gravity.y = 1.2
      setIsZeroG(false)
      toast.success('Simulation Active 🪐', {
        description: 'Gravity is now active! Energy monitoring is live.',
        icon: '🪐',
        duration: 2500,
      })
    }
  }, [])

  const handleBodyClick = useCallback((body) => {
    setSelectedBody(body)
  }, [])

  
  const handleGravityChange = useCallback((gy) => {
    if (engineRef.current) {
      engineRef.current.gravity.y = gy
      engineRef.current.gravity.x = 0
    }
  }, [])

  
  const handlePropertyChange = useCallback((key, val) => {
    const body = selectedBody
    if (!body || !window.Matter) return
    const { Body: MatterBody } = window.Matter
    if (key === 'mass') MatterBody.setMass(body, val)
    if (key === 'friction') { body.friction = val }
    if (key === 'restitution') { body.restitution = val }
    if (key === 'frictionAir') { body.frictionAir = val }
    if (key === 'isStatic') { MatterBody.setStatic(body, val) }
  }, [selectedBody])

  const handleDeleteBody = useCallback((body) => {
    if (!body || !engineRef.current || !window.Matter) return

    const { Composite, World, Events } = window.Matter
    const engine = engineRef.current
    const bodiesToRemove = []
    const constraintsToRemove = []

    const group = body.collisionFilter?.group
    const label = body.label || ''

    if (label.startsWith('rope') && group) {
      const ropeBodies = Composite.allBodies(engine.world).filter(b =>
        b.collisionFilter?.group === group
      )
      bodiesToRemove.push(...ropeBodies)
    } else if (label.startsWith('spring') && group) {
      const springBodies = Composite.allBodies(engine.world).filter(b =>
        b.collisionFilter?.group === group
      )
      bodiesToRemove.push(...springBodies)
    } else if (label.startsWith('motor') || label === 'motor-hub' || label === 'motor-disc' || label === 'motor-spoke') {
      const connected = [body]
      Composite.allConstraints(engine.world).forEach(c => {
        if (c.bodyA === body && c.bodyB && !connected.includes(c.bodyB)) connected.push(c.bodyB)
        if (c.bodyB === body && c.bodyA && !connected.includes(c.bodyA)) connected.push(c.bodyA)
      })
      bodiesToRemove.push(...connected)
    } else if (label.startsWith('pulley') || label === 'pulley-axis' || label === 'pulley-wheel' || label === 'pulley-spokes') {
      const connected = [body]
      Composite.allConstraints(engine.world).forEach(c => {
        if (c.bodyA === body && c.bodyB && !connected.includes(c.bodyB)) connected.push(c.bodyB)
        if (c.bodyB === body && c.bodyA && !connected.includes(c.bodyA)) connected.push(c.bodyA)
      })
      bodiesToRemove.push(...connected)
    } else {
      bodiesToRemove.push(body)
    }

    const allConstraints = Composite.allConstraints(engine.world)
    allConstraints.forEach(c => {
      if (bodiesToRemove.includes(c.bodyA) || bodiesToRemove.includes(c.bodyB)) {
        constraintsToRemove.push(c)
      }
    })

    constraintsToRemove.forEach(c => World.remove(engine.world, c))
    bodiesToRemove.forEach(b => {
      if (b._motorHandler && b._motorEngine) {
        Events.off(b._motorEngine, 'beforeUpdate', b._motorHandler)
      }
      World.remove(engine.world, b)
    })

    setBodyCount(c => Math.max(0, c - bodiesToRemove.length))
    setSelectedBody(null)
    toast('Element deleted', { icon: '🗑️', duration: 1000 })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
          return
        }
        if (selectedBody) {
          handleDeleteBody(selectedBody)
        } else if (engineRef.current && window.Matter) {
          const { Composite } = window.Matter
          const bodies = Composite.allBodies(engineRef.current.world).filter(b =>
            b.label !== 'boundary' &&
            b.label !== 'floor' &&
            b.label !== 'pulley-axis' &&
            b.label !== 'motor-hub'
          )
          if (bodies.length > 0) {
            const target = bodies[bodies.length - 1]
            handleDeleteBody(target)
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedBody, handleDeleteBody])

  const handleBodyGrab = useCallback((body) => {
    emitBodyGrab(roomId, body.id, body.position, body.velocity, 0)
  }, [roomId])

  const handleBodyRelease = useCallback((body) => {
    emitBodyRelease(roomId, body.id, 0)
  }, [roomId])

  return (
    <div className="fixed inset-0 bg-void overflow-hidden">

      {}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(30,48,72,0.28) 1px, transparent 1px),
          linear-gradient(90deg, rgba(30,48,72,0.28) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `
          linear-gradient(rgba(30,48,72,0.10) 1px, transparent 1px),
          linear-gradient(90deg, rgba(30,48,72,0.10) 1px, transparent 1px)`,
        backgroundSize: '12px 12px',
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(2,4,8,0.65) 100%)',
      }} />

      {}
      <PhysicsCanvas
        engineRef={engineRef}
        onBodyClick={handleBodyClick}
        onEngineReady={handleEngineReady}
        onBodyGrab={handleBodyGrab}
        onBodyRelease={handleBodyRelease}
      />

      {}
      <AnimatePresence>
        {isZeroG && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-20 left-1/2 z-40 px-5 py-3 rounded-2xl flex items-center gap-4 border"
            style={{
              background: 'rgba(8,15,26,0.92)',
              backdropFilter: 'blur(20px) saturate(180%)',
              borderColor: 'rgba(0,245,255,0.25)',
              boxShadow: '0 8px 32px 0 rgba(0, 245, 255, 0.15)',
            }}
          >
            <div className="flex flex-col">
              <span className="text-[11px] font-mono text-cyan-neon uppercase tracking-wider font-semibold">Zero-G Assembly Mode</span>
              <span className="text-[10px] text-slate-400">Ropes & springs snap on touch. Click when done!</span>
            </div>

            <motion.button
              onClick={handleApplyGravity}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/35 transition-all duration-150"
              style={{ boxShadow: '0 0 12px rgba(16,185,129,0.1)' }}
            >
              <Play className="w-3 h-3 fill-current" />
              Done (Simulate Gravity)
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AIChatBubble engineRef={engineRef} onBodyCountChange={setBodyCount} />

      {}
      <motion.div
        className="absolute top-[72px] left-4 z-30 flex flex-col gap-3 items-start"
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
      >
        <ExperimentRecorder engineRef={engineRef} />

        {}
        <motion.button
          onClick={() => {
            setSaveName(roomId ? `${roomId}-saved` : '')
            setShowSaveModal(true)
          }}
          whileTap={{ scale: 0.94 }}
          className="toolbar-float rounded-2xl px-4 h-10 flex items-center gap-2 text-slate-400 hover:text-emerald-300 transition-all duration-200 border"
          style={{
            background: 'rgba(8,15,26,0.92)',
            backdropFilter: 'blur(20px)',
            borderColor: 'rgba(16,185,129,0.15)',
            width: '100%',
            justifyContent: 'center',
          }}
          title="Save Sandbox State"
        >
          <Save className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-medium">Save Sandbox</span>
        </motion.button>
      </motion.div>

      {}
      <LiveCursors socketEnabled={socketReady} />

      {}
      <BodyOwnershipOverlay engine={engineObj} socketEnabled={socketReady} />

      {}
      <CanvasToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        onDropSpawn={handleDropSpawn}
        onClear={handleClear}
        onZeroG={handleZeroG}
        onBack={() => navigate('/dashboard')}
      />

      {}
      <CollabSidebar isLocked={isLocked} onToggleLock={() => setIsLocked(v => !v)} socketReady={socketReady} />

      {}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
        {}
        <motion.button
          onClick={() => setShowLibrary(v => !v)}
          whileTap={{ scale: 0.94 }}
          className="toolbar-float rounded-2xl px-3 h-10 flex items-center gap-2 text-slate-400 hover:text-slate-100 transition-colors"
          style={{
            background: 'rgba(8,15,26,0.92)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          title="Open Experiment Library"
        >
          <BookOpen className="w-4 h-4 text-cyan-neon" />
          <span className="text-xs font-mono hidden sm:block">Library</span>
        </motion.button>
      </div>

      {}
      <AnimatePresence>
        {showLibrary && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute inset-y-0 right-0 z-40 w-full max-w-2xl overflow-y-auto"
            style={{
              background: 'rgba(6,12,22,0.97)',
              backdropFilter: 'blur(30px)',
              borderLeft: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <button
              onClick={() => setShowLibrary(false)}
              className="absolute top-4 right-4 z-50 text-slate-500 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
            <LibraryPage engine={engineObj} />
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card-dark w-full max-w-md p-6 space-y-5"
              style={{
                background: 'rgba(8,15,26,0.92)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(16,185,129,0.3)',
                boxShadow: '0 8px 32px 0 rgba(16, 185, 129, 0.15)',
              }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold text-white flex items-center gap-2">
                  <Save className="w-4 h-4 text-emerald-400" />
                  Save Sandbox
                </h2>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="text-slate-500 hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-mono uppercase tracking-wider block mb-1.5">
                  Sandbox Name
                </label>
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="e.g. My Pendulum Setup"
                  className="input-dark w-full text-sm font-sans"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#fff',
                  }}
                  autoFocus
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="btn-ghost flex-1 text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveExperiment}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/35 text-emerald-400 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all disabled:opacity-50"
                  style={{ boxShadow: '0 0 12px rgba(16,185,129,0.1)' }}
                >
                  {saving ? 'Saving...' : 'Save Sandbox'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {}
      <PropertiesPanel
        selectedBody={selectedBody}
        engineRef={engineRef}
        onPropertyChange={handlePropertyChange}
        onGravityChange={handleGravityChange}
        onDelete={handleDeleteBody}
      />

      {}
      <AnalyticsPanel engine={engineObj} />

      {}
      <StatusBar
        roomId={roomId}
        bodyCount={bodyCount}
        isConnected={socketReady}
        mousePos={mousePos}
      />
    </div>
  )
}
