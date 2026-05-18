import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { onPeerGrabbed, onPeerReleased } from '../../services/socket'
import Matter from 'matter-js'

const { Composite } = Matter

export default function BodyOwnershipOverlay({ engine, socketEnabled }) {
  // { [bodyId]: { userId, username, color } }
  const [ownership, setOwnership] = useState({})
  const [positions, setPositions] = useState({})

  // Listen to socket events for grabbed bodies
  useEffect(() => {
    if (!socketEnabled) return

    const handleGrabbed = (payload) => {
      setOwnership(prev => ({ ...prev, [payload.bodyId]: payload }))
    }
    const handleReleased = (payload) => {
      setOwnership(prev => {
        const next = { ...prev }
        delete next[payload.bodyId]
        return next
      })
    }

    // Register event listeners
    // Our socket.js already sets up these emitters correctly
    onPeerGrabbed(handleGrabbed)
    onPeerReleased(handleReleased)
    
    // We do not return cleanup because socket.js offAll() manages global cleanup, 
    // or we can safely just let the state update.
  }, [socketEnabled])

  // Track body positions at 60Hz
  useEffect(() => {
    if (!engine) return
    let raf
    const tick = () => {
      if (Object.keys(ownership).length > 0) {
        const all = Composite.allBodies(engine.world)
        const newPos = {}
        for (const bodyId of Object.keys(ownership)) {
          const b = all.find(body => body.id === Number(bodyId))
          if (b) {
            newPos[bodyId] = { x: b.position.x, y: b.position.y }
          }
        }
        setPositions(newPos)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [engine, ownership])

  return (
    <div className="absolute inset-0 pointer-events-none z-10" aria-hidden>
      <AnimatePresence>
        {Object.entries(ownership).map(([bodyId, owner]) => {
          const pos = positions[bodyId]
          if (!pos) return null

          return (
            <motion.div
              key={`owner-${bodyId}`}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ type: 'spring', stiffness: 250, damping: 25 }}
              className="absolute pointer-events-none"
              style={{ translateX: '-50%', translateY: '-200%' }} // Display above the body
            >
              <div
                className="px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap shadow-lg flex items-center gap-1.5"
                style={{
                  background: `${owner.color || '#00f5ff'}33`,
                  border: `1px solid ${owner.color || '#00f5ff'}80`,
                  color: owner.color || '#00f5ff',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: owner.color || '#00f5ff', boxShadow: `0 0 6px ${owner.color || '#00f5ff'}` }} />
                {owner.username || 'User'}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
