import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { onPeerCursor } from '../../services/socket'

function CursorSVG({ color }) {
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <path
        d="M4 2L18 10.5L10.5 12.5L7.5 20L4 2Z"
        fill={color}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth="1"
      />
      <path
        d="M4 2L18 10.5L10.5 12.5L7.5 20L4 2Z"
        fill={color}
        opacity="0.4"
        style={{ filter: `blur(4px)` }}
      />
    </svg>
  )
}

export default function LiveCursors({ socketEnabled = false }) {
  
  const [users, setUsers] = useState({})

  
  useEffect(() => {
    if (!socketEnabled) return
    
    onPeerCursor(({ userId, username, color, position }) => {
      setUsers(prev => ({
        ...prev,
        [userId]: { position, name: username || 'User', color: color || '#00f5ff', lastSeen: Date.now() }
      }))
    })

    
    const interval = setInterval(() => {
      const now = Date.now()
      setUsers(prev => {
        const next = { ...prev }
        let changed = false
        for (const [id, user] of Object.entries(next)) {
          if (now - user.lastSeen > 3000) {
            delete next[id]
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [socketEnabled])

  return (
    <div className="absolute inset-0 pointer-events-none z-20" aria-hidden>
      {Object.entries(users).map(([userId, user]) => {
        const pos = user.position
        if (!pos) return null

        return (
          <motion.div
            key={userId}
            className="absolute"
            animate={{ x: pos.x, y: pos.y }}
            transition={{
              type: 'spring',
              stiffness: 90,
              damping: 22,
              mass: 0.8,
            }}
            style={{ top: 0, left: 0, translateX: '-4px', translateY: '-2px' }}
          >
            {}
            <CursorSVG color={user.color} />

            {}
            <motion.div
              className="absolute top-5 left-4 px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap"
              style={{
                background: `${user.color}22`,
                border: `1px solid ${user.color}50`,
                color: user.color,
                backdropFilter: 'blur(6px)',
                boxShadow: `0 0 8px ${user.color}30`,
              }}
            >
              {user.name}
            </motion.div>

            {}
            <div
              className="absolute -inset-2 rounded-full pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 50%, ${user.color}15 0%, transparent 70%)`,
                width: 40,
                height: 40,
                top: -10,
                left: -10,
              }}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
