import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  MousePointer2, Square, Circle, Hexagon,
  Link2, Zap, Trash2, ChevronLeft,
} from 'lucide-react'

// Pivot joint icon (crosshair + circle)
function PivotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="9" />
      <line x1="12" y1="15" x2="12" y2="22" />
      <line x1="2" y1="12" x2="9" y2="12" />
      <line x1="15" y1="12" x2="22" y2="12" />
    </svg>
  )
}

// Motor icon (rotating arrows)
function MotorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <circle cx="12" cy="12" r="4" />
      <path d="M4.93 4.93 A9 9 0 0 1 21 12" />
      <path d="M21 12 A9 9 0 0 1 4.93 19.07" />
      <polyline points="19 9 21 12 18 12" />
    </svg>
  )
}

// Brick Wall icon
function BrickWallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v6" />
      <path d="M15 3v6" />
      <path d="M6 9v6" />
      <path d="M12 9v6" />
      <path d="M18 9v6" />
      <path d="M9 15v6" />
      <path d="M15 15v6" />
    </svg>
  )
}

// Pulley icon
function PulleyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M6 12v6" />
      <path d="M18 12v6" />
      <path d="M6 12a6 6 0 0 1 12 0" />
    </svg>
  )
}

const TOOLS = [
  { id: 'select',    icon: MousePointer2, label: 'Select',      shortcut: 'V', spawns: false },
  { id: 'rectangle', icon: Square,        label: 'Add Square',  shortcut: 'R', spawns: true  },
  { id: 'circle',    icon: Circle,        label: 'Add Circle',  shortcut: 'C', spawns: true  },
  { id: 'polygon',   icon: Hexagon,       label: 'Add Polygon', shortcut: 'P', spawns: true  },
  { id: 'wall',      icon: BrickWallIcon, label: 'Add Wall',    shortcut: 'W', spawns: true, isSvg: true },
  { id: 'rope',      icon: Link2,         label: 'Add Rope',    shortcut: 'T', spawns: true  },
  { id: 'spring',    icon: Zap,           label: 'Add Spring',  shortcut: 'S', spawns: true  },
  { id: 'pivot',     icon: PivotIcon,     label: 'Add Pivot',   shortcut: 'J', spawns: true, isSvg: true },
  { id: 'motor',     icon: MotorIcon,     label: 'Add Motor',   shortcut: 'M', spawns: true, isSvg: true },
  { id: 'pulley',    icon: PulleyIcon,    label: 'Add Pulley',  shortcut: 'U', spawns: true, isSvg: true },
]

const GHOST_COLORS = {
  rectangle: 'rgba(0,245,255,0.9)',
  circle:    'rgba(191,0,255,0.9)',
  polygon:   'rgba(57,255,20,0.9)',
  wall:      'rgba(255,255,255,0.9)',
  rope:      'rgba(251,191,36,0.9)',
  spring:    'rgba(57,255,20,0.9)',
  pivot:     'rgba(255,120,60,0.9)',
  motor:     'rgba(255,200,0,0.9)',
  pulley:    'rgba(0,245,255,0.9)',
}

function DragGhost({ tool, pos }) {
  if (!tool || !pos) return null
  const color = GHOST_COLORS[tool.id] || 'rgba(0,245,255,0.9)'
  const Icon = tool.icon
  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x, top: pos.y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        transition: 'none',
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        border: `2px dashed ${color}`,
        background: `${color}18`,
        boxShadow: `0 0 24px ${color}44, 0 0 8px ${color}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        <Icon />
      </div>
      <div style={{
        textAlign: 'center', marginTop: 5, fontSize: 10,
        color, fontWeight: 700, letterSpacing: '0.06em',
        textShadow: `0 0 8px ${color}`,
      }}>
        {tool.label.replace('Add ', '').toUpperCase()}
      </div>
    </div>
  )
}

function ToolBtn({ tool, isActive, onDragStart }) {
  const [hovered, setHovered] = useState(false)
  const Icon = tool.icon

  const handleMouseDown = useCallback((e) => {
    if (!tool.spawns) return
    e.preventDefault()
    onDragStart(tool, e.clientX, e.clientY)
  }, [tool, onDragStart])

  const handleClick = useCallback(() => {
    if (!tool.spawns) onDragStart(tool, 0, 0)
  }, [tool, onDragStart])

  return (
    <div className="relative">
      <motion.button
        onMouseDown={handleMouseDown}
        onClick={!tool.spawns ? handleClick : undefined}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        whileTap={{ scale: 0.88 }}
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 relative
          ${isActive
            ? 'bg-cyan-neon/15 text-cyan-neon border border-cyan-neon/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
          }
          ${tool.spawns ? 'cursor-grab' : 'cursor-pointer'}
        `}
        style={isActive ? {
          boxShadow: '0 0 10px rgba(0,245,255,0.25), inset 0 0 8px rgba(0,245,255,0.08)',
        } : {}}
      >
        <Icon className={tool.isSvg ? '' : 'w-4 h-4'} />
        {isActive && (
          <motion.span
            layoutId="activeTool"
            className="absolute inset-0 rounded-xl"
            style={{ background: 'radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%)' }}
          />
        )}
      </motion.button>

      {hovered && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none"
        >
          <div className="glass rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap flex items-center gap-2">
            <span className="text-slate-200">{tool.label}</span>
            <kbd className="font-mono text-[10px] text-cyan-neon bg-cyan-neon/10 rounded px-1 py-0.5">
              {tool.shortcut}
            </kbd>
            {tool.spawns && (
              <span className="text-slate-500 text-[10px]">drag to place</span>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default function CanvasToolbar({ activeTool, onToolChange, onDropSpawn, onClear, onBack, onZeroG }) {
  const [dragging, setDragging] = useState(null)
  const [ghostPos, setGhostPos] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = useCallback((tool, x, y) => {
    if (!tool.spawns) {
      onToolChange(tool.id)
      return
    }
    onToolChange(tool.id)
    setDragging({ tool })
    setGhostPos({ x, y })
    setIsDragging(true)

    const onMove = (e) => setGhostPos({ x: e.clientX, y: e.clientY })
    const onUp = (e) => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      setDragging(null)
      setGhostPos(null)
      setIsDragging(false)
      if (e.clientY > 80) onDropSpawn(tool.id, e.clientX, e.clientY)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [onToolChange, onDropSpawn])

  const coreTools = TOOLS.slice(0, 7)
  const jointTools = TOOLS.slice(7)

  return (
    <>
      <DragGhost tool={dragging?.tool} pos={ghostPos} />
      {isDragging && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          cursor: 'crosshair', background: 'rgba(0,245,255,0.02)',
        }} />
      )}

      <motion.div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-[9995] flex items-center gap-1.5"
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      >
        <motion.button
          onClick={onBack}
          whileTap={{ scale: 0.94 }}
          className="toolbar-float rounded-2xl px-3 h-12 flex items-center text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </motion.button>

        <div
          className="toolbar-float rounded-2xl px-3 h-12 flex items-center gap-1"
          style={{
            background: 'rgba(8,15,26,0.92)',
            backdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          {coreTools.map((tool, i) => (
            <div key={tool.id} className="flex items-center">
              <ToolBtn tool={tool} isActive={activeTool === tool.id} onDragStart={handleDragStart} />
              {i === 0 && <div className="w-px h-5 bg-white/10 mx-1" />}
            </div>
          ))}

          {/* Joint section separator with label */}
          <div className="flex items-center ml-1">
            <div className="w-px h-5 bg-white/10 mr-1" />
            <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest mr-1 select-none">
              joints
            </span>
          </div>

          {jointTools.map((tool) => (
            <ToolBtn key={tool.id} tool={tool} isActive={activeTool === tool.id} onDragStart={handleDragStart} />
          ))}

          <div className="w-px h-5 bg-white/10 mx-1" />
          
          {/* Zero-G / Empty Workspace */}
          <motion.button
            onClick={onZeroG}
            whileTap={{ scale: 0.88 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-cyan-neon hover:bg-cyan-neon/10 transition-all duration-150"
            title="Zero-G Workspace (Pulley Setup)"
          >
            <Zap className="w-4 h-4" />
          </motion.button>

          <motion.button
            onClick={onClear}
            whileTap={{ scale: 0.88 }}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all duration-150"
            title="Clear All (Del)"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>

        <motion.div
          animate={{ opacity: isDragging ? 1 : 0, y: isDragging ? 0 : 4 }}
          transition={{ duration: 0.15 }}
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] text-cyan-neon/70 whitespace-nowrap pointer-events-none font-mono tracking-wider"
        >
          ↓ DROP TO PLACE
        </motion.div>
      </motion.div>
    </>
  )
}
