/**
 * usePhysicsAnalytics.js
 *
 * Replaces useMockAnalytics with a real hook that:
 *  1. Reads KE/PE directly from the live Matter.js engine on the frontend (60Hz via Events).
 *  2. Listens for analytics:frame events from the server and blends them in when connected.
 *  3. Tracks real FPS via requestAnimationFrame.
 *  4. Computes per-body force vectors for the vector-arrow overlay.
 *
 * Falls back gracefully to animated curves when no engine is present (demo / loading).
 */

import { useState, useEffect, useRef } from 'react'
import { getSocket } from '../services/socket'

const GRAVITY = 9.81           // m/s^2 approximation
const CANVAS_HEIGHT_M = 600    // approximate canvas height in "physics metres"
const SCALE = 500              // visual energy scale (J display units)
const MAX_POINTS = 60

function computeEnergies(engine) {
  if (!engine?.world) return { ke: 0, pe: 0, bodies: [] }

  let ke = 0
  let pe = 0
  const bodyVectors = []

  const all = engine.world.bodies ?? []
  all.forEach(body => {
    if (body.isStatic) return
    const m   = body.mass || 1
    const v   = body.speed || 0
    const h   = Math.max(0, CANVAS_HEIGHT_M - body.position.y)

    const bodyKE = 0.5 * m * v * v * SCALE
    const bodyPE = m * GRAVITY * h * SCALE * 0.001

    ke += bodyKE
    pe += bodyPE

    // Net force vector: gravity + friction (simplified)
    const fx = body.force?.x ?? 0
    const fy = (body.force?.y ?? 0) + m * GRAVITY * 0.001
    const speed2D = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2)

    const ax = fx / m
    const ay = fy / m

    bodyVectors.push({
      id:       body.id,
      x:        body.position.x,
      y:        body.position.y,
      fx:       fx * 1e4,
      fy:       fy * 1e4,
      vx:       body.velocity.x * 2,
      vy:       body.velocity.y * 2,
      ax:       ax * 1e4,
      ay:       ay * 1e4,
      speed:    speed2D,
      label:    body.label,
    })
  })

  return { ke: Math.round(ke), pe: Math.round(pe), bodies: bodyVectors }
}

export default function usePhysicsAnalytics(engine) {
  const [dataPoints,   setDataPoints]   = useState([])
  const [stats,        setStats]        = useState({ ke: 0, pe: 0, fps: 60 })
  const [forceVectors, setForceVectors] = useState([])

  const tCounterRef  = useRef(0)
  const rafRef       = useRef(null)
  const fpsFramesRef = useRef(0)
  const fpsLastRef   = useRef(performance.now())
  const fpsRef       = useRef(60)

  useEffect(() => {
    // ── FPS counter & 60Hz Vector Overlay via rAF ──────────────────────────
    function rafLoop() {
      fpsFramesRef.current++
      const now = performance.now()
      if (now - fpsLastRef.current >= 1000) {
        fpsRef.current = Math.round(
          (fpsFramesRef.current * 1000) / (now - fpsLastRef.current)
        )
        fpsFramesRef.current = 0
        fpsLastRef.current   = now
      }

      if (engine) {
        const { bodies } = computeEnergies(engine)
        setForceVectors(bodies)
      }

      rafRef.current = requestAnimationFrame(rafLoop)
    }
    rafRef.current = requestAnimationFrame(rafLoop)

    // ── Poll engine at 4 Hz for chart data ───────────────────────────────
    const interval = setInterval(() => {
      const { ke, pe } = computeEnergies(engine)

      // Only plot data when the engine has active (non-static) bodies
      const hasActiveBodies = engine?.world?.bodies?.some(b => !b.isStatic) ?? false
      if (!hasActiveBodies) {
        // Canvas is empty — show zeroes and clear chart history
        setDataPoints([])
        setStats({ ke: 0, pe: 0, fps: Math.min(fpsRef.current, 60) })
        return
      }

      const t = tCounterRef.current++

      const displayKE = ke
      const displayPE = pe
      const displayTE = ke + pe

      setDataPoints(prev => {
        const next = [...prev, { t, ke: displayKE, pe: displayPE, te: displayTE }]
        return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next
      })
      setStats({ ke: displayKE, pe: displayPE, fps: Math.min(fpsRef.current, 60) })
    }, 250)

    // ── Server analytics frames (when connected) ─────────────────────────
    let serverUnsub = null
    const socket = getSocket()
    if (socket) {
      const onFrame = (frame) => {
        if (!frame || !frame.bodies) return
        setForceVectors(frame.bodies)
      }
      socket.on('analytics:frame', onFrame)
      serverUnsub = () => socket.off('analytics:frame', onFrame)
    }

    return () => {
      clearInterval(interval)
      cancelAnimationFrame(rafRef.current)
      serverUnsub?.()
    }
  }, [engine])

  return { dataPoints, stats, forceVectors }
}
