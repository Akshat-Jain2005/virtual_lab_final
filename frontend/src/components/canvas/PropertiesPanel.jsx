import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, ChevronUp, ChevronDown, MapPin } from 'lucide-react'

const PROPERTIES = [
  {
    key: 'mass',
    label: 'Mass',
    unit: 'kg',
    min: 0.1,
    max: 50,
    step: 0.1,
    default: 5.0,
    color: '#00f5ff',
    description: 'Affects gravitational pull and collision force',
  },
  {
    key: 'friction',
    label: 'Friction',
    unit: '',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.1,
    color: '#bf00ff',
    description: 'Surface resistance when sliding',
  },
  {
    key: 'restitution',
    label: 'Bounciness (e value)',
    unit: '',
    min: 0,
    max: 1,
    step: 0.01,
    default: 0.72,
    color: '#39ff14',
    description: 'Coefficient of restitution for collisions',
  },
  {
    key: 'frictionAir',
    label: 'Air Drag',
    unit: '',
    min: 0,
    max: 0.1,
    step: 0.001,
    default: 0.008,
    color: '#fbbf24',
    description: 'Resistance from air while moving',
  },
]

const GRAVITY_PRESETS = [
  { label: 'Normal', gy: 1.2,  icon: '🌍' },
  { label: 'Moon',   gy: 0.2,  icon: '🌙' },
  { label: 'Zero-g', gy: 0,    icon: '🚀' },
  { label: 'Hyper',  gy: 3.0,  icon: '⚡' },
]

function PropertySlider({ prop, value, onChange }) {
  const pct = ((value - prop.min) / (prop.max - prop.min)) * 100

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-slate-300 font-medium">{prop.label}</span>
          {prop.description && (
            <p className="text-slate-600 text-[10px] mt-0.5">{prop.description}</p>
          )}
        </div>
        <span
          className="font-mono text-xs px-2 py-0.5 rounded-md"
          style={{
            color: prop.color,
            background: `${prop.color}18`,
            border: `1px solid ${prop.color}30`,
          }}
        >
          {Number(value).toFixed(prop.step < 0.1 ? 3 : 1)}{prop.unit}
        </span>
      </div>

      <div className="relative h-4 flex items-center">
        <div className="absolute w-full h-1 rounded-full bg-white/6" />
        <div
          className="absolute h-1 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${prop.color}60, ${prop.color})`,
            boxShadow: `0 0 6px ${prop.color}60`,
          }}
        />
        <input
          type="range"
          min={prop.min}
          max={prop.max}
          step={prop.step}
          value={value}
          onChange={e => onChange(prop.key, parseFloat(e.target.value))}
          className="absolute w-full appearance-none bg-transparent cursor-pointer"
          style={{ '--thumb-color': prop.color }}
        />
      </div>
    </div>
  )
}

export default function PropertiesPanel({ selectedBody, engineRef, onPropertyChange, onGravityChange, onDelete }) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeGravity, setActiveGravity] = useState('Normal')

  // ── FIX: sync slider values when a body is selected ──────────────────────
  const [values, setValues] = useState({
    ...Object.fromEntries(PROPERTIES.map(p => [p.key, p.default])),
    isStatic: false,
  })

  useEffect(() => {
    if (!selectedBody) return
    setValues({
      mass:        selectedBody.mass        ?? 5.0,
      friction:    selectedBody.friction    ?? 0.1,
      restitution: selectedBody.restitution ?? 0.72,
      frictionAir: selectedBody.frictionAir ?? 0.008,
      isStatic:    selectedBody.isStatic    ?? false,
    })
  }, [selectedBody])

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }))
    // ── FIX: actually apply the change to the Matter.js body ──────────────
    if (onPropertyChange) onPropertyChange(key, val)
  }

  const handleGravity = (preset) => {
    setActiveGravity(preset.label)
    // ── FIX: call parent which changes engine.gravity.y ───────────────────
    if (onGravityChange) onGravityChange(preset.gy)
  }

  // ── FIX: show live position of selected body ──────────────────────────────
  const [bodyPos, setBodyPos] = useState(null)
  useEffect(() => {
    if (!selectedBody) { setBodyPos(null); return }
    const interval = setInterval(() => {
      if (selectedBody?.position) {
        setBodyPos({
          x: Math.round(selectedBody.position.x),
          y: Math.round(selectedBody.position.y),
        })
      }
    }, 100)
    return () => clearInterval(interval)
  }, [selectedBody])

  return (
    <motion.div
      className="absolute bottom-4 left-4 z-30 w-60"
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
    >
      <div
        className="toolbar-float overflow-hidden"
        style={{
          background: 'rgba(8,15,26,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        {/* Header */}
        <button
          onClick={() => setIsOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors"
        >
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-neon" />
            <span className="font-display text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              Properties
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedBody && (
              <span className="badge badge-cyan text-[9px] px-1.5">
                {selectedBody.label || 'body'}
              </span>
            )}
            {isOpen
              ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              : <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            }
          </div>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              <div className="px-4 pb-4 space-y-5 border-t border-white/5 pt-4">

                {!selectedBody ? (
                  <p className="text-xs text-slate-600 text-center py-1 font-mono">
                    Click a body to select it
                  </p>
                ) : (
                  /* ── FIX: Show live coordinates of selected body ── */
                  bodyPos && (
                    <div className="flex items-center justify-between bg-white/4 rounded-lg px-3 py-2 text-[10px] font-mono">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-neon shrink-0" />
                        <span className="text-slate-500">Pos:</span>
                        <span className="text-cyan-neon">x={bodyPos.x}</span>
                        <span className="text-violet-400">y={bodyPos.y}</span>
                      </div>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(selectedBody)}
                          className="text-red-400 hover:text-red-200 transition-colors p-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md font-sans font-semibold text-[9px] px-2 py-0.5"
                          style={{ textShadow: '0 0 4px rgba(239, 68, 68, 0.2)' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )
                )}

                {PROPERTIES.map(prop => (
                  <PropertySlider
                    key={prop.key}
                    prop={prop}
                    value={values[prop.key]}
                    onChange={handleChange}
                  />
                ))}

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-xs text-slate-300 font-medium">Fixed Object (Wall)</span>
                    <p className="text-[10px] text-slate-600">Pin object in place</p>
                  </div>
                  <button
                    onClick={() => handleChange('isStatic', !values.isStatic)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      values.isStatic ? 'bg-cyan-neon' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      values.isStatic ? 'translate-x-4' : ''
                    }`} />
                  </button>
                </div>

                {/* Gravity quick-set — FIX: now actually changes gravity */}
                <div className="pt-1 border-t border-white/5 space-y-2">
                  <span className="font-display text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">
                    Environment
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {GRAVITY_PRESETS.map(g => (
                      <button
                        key={g.label}
                        onClick={() => handleGravity(g)}
                        className={`text-[10px] py-1.5 rounded-lg border transition-all flex items-center justify-center gap-1
                          ${activeGravity === g.label
                            ? 'border-cyan-neon/40 text-cyan-neon bg-cyan-neon/10'
                            : 'border-white/6 text-slate-400 hover:border-cyan-neon/30 hover:text-cyan-neon bg-white/3 hover:bg-cyan-neon/5'
                          }`}
                      >
                        <span>{g.icon}</span>
                        <span>{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom slider thumb styling */}
      <style>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--thumb-color, #00f5ff);
          border: 2px solid rgba(0,0,0,0.6);
          box-shadow: 0 0 8px var(--thumb-color, rgba(0,245,255,0.6));
          cursor: pointer;
          transition: transform 0.1s;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        input[type='range']::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--thumb-color, #00f5ff);
          border: 2px solid rgba(0,0,0,0.6);
          box-shadow: 0 0 8px var(--thumb-color, rgba(0,245,255,0.6));
          cursor: pointer;
        }
      `}</style>
    </motion.div>
  )
}