import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { BarChart3, ChevronUp, ChevronDown, Zap, Activity, Cpu, Eye, EyeOff } from 'lucide-react'
import usePhysicsAnalytics from '../../hooks/usePhysicsAnalytics'

const CHART_HEIGHT = 140


function StatBadge({ icon: Icon, label, value, color, unit = '' }) {
  return (
    <div
      className="flex-1 rounded-xl p-2.5 space-y-1"
      style={{ background: `${color}0d`, border: `1px solid ${color}20` }}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3" style={{ color }} />
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{label}</span>
      </div>
      <div className="font-mono text-sm font-semibold" style={{ color }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-[10px] text-slate-600 ml-1">{unit}</span>}
      </div>
    </div>
  )
}


const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass rounded-xl px-3 py-2 text-xs" style={{ border: '1px solid rgba(0,245,255,0.2)' }}>
      <p className="text-slate-500 font-mono mb-1">t={label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-mono">{p.value?.toLocaleString()} J</span>
        </p>
      ))}
    </div>
  )
}


export function ForceVectorOverlay({ vectors, visible }) {
  if (!visible || !vectors?.length) return null

  const ARROW_SCALE  = 18   
  const MIN_SHOW     = 0.05 

  return (
    <svg
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 25 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker id="arrowCyan" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(0,245,255,0.85)" />
        </marker>
        <marker id="arrowRed" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,80,80,0.85)" />
        </marker>
        <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(57,255,20,0.85)" />
        </marker>
        <marker id="arrowPurple" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="rgba(191,0,255,0.85)" />
        </marker>
      </defs>

      {vectors.map((v) => {
        const mag = Math.sqrt(v.fx ** 2 + v.fy ** 2)
        if (mag < MIN_SHOW) return null


        
        const vMag = Math.sqrt((v.vx||0)**2 + (v.vy||0)**2)
        const vEx = vMag > MIN_SHOW ? v.x + (v.vx / vMag) * Math.min(vMag * ARROW_SCALE, 60) : v.x
        const vEy = vMag > MIN_SHOW ? v.y + (v.vy / vMag) * Math.min(vMag * ARROW_SCALE, 60) : v.y
        const velLine = vMag >= MIN_SHOW ? (
          <line
            x1={v.x} y1={v.y} x2={vEx} y2={vEy}
            stroke="rgba(57,255,20,0.7)"
            strokeWidth="2"
            markerEnd="url(#arrowGreen)"
          />
        ) : null

        
        const aMag = Math.sqrt((v.ax||0)**2 + (v.ay||0)**2)
        const aEx = aMag > MIN_SHOW ? v.x + (v.ax / aMag) * Math.min(aMag * (ARROW_SCALE/2), 60) : v.x
        const aEy = aMag > MIN_SHOW ? v.y + (v.ay / aMag) * Math.min(aMag * (ARROW_SCALE/2), 60) : v.y
        const accLine = aMag >= MIN_SHOW ? (
          <line
            x1={v.x} y1={v.y} x2={aEx} y2={aEy}
            stroke="rgba(191,0,255,0.7)"
            strokeWidth="2"
            markerEnd="url(#arrowPurple)"
          />
        ) : null

        return (
          <g key={v.id}>
            {velLine}
            {accLine}
            {}
            <text
              x={v.x + 8} y={v.y - 8}
              fill="rgba(100,200,255,0.6)"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
            >
              {v.speed.toFixed(1)} m/s
            </text>
          </g>
        )
      })}
    </svg>
  )
}


export default function AnalyticsPanel({ engine }) {
  const [isOpen,        setIsOpen]        = useState(false)
  const [showVectors,   setShowVectors]   = useState(true)

  const { dataPoints, stats, forceVectors } = usePhysicsAnalytics(engine)

  const chartData = dataPoints.slice(-30)

  return (
    <>
      {}
      <ForceVectorOverlay vectors={forceVectors} visible={showVectors} />

      <motion.div
        className="absolute bottom-4 right-4 z-30 w-80"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
      >
        <div
          className="toolbar-float overflow-hidden"
          style={{
            background: 'rgba(8,15,26,0.88)',
            backdropFilter: 'blur(20px) saturate(180%)',
          }}
        >
          {}
          <div className="flex items-center">
            <button
              onClick={() => setIsOpen(v => !v)}
              className="flex-1 flex items-center gap-2 px-4 py-3 hover:bg-white/3 transition-colors text-left"
            >
              <BarChart3 className="w-3.5 h-3.5 text-cyan-neon" />
              <span className="font-display text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Analytics
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-lime-neon animate-pulse"
                  style={{ boxShadow: '0 0 6px rgba(57,255,20,0.8)' }} />
                <span className="text-[10px] text-lime-neon font-mono">LIVE</span>
              </span>
              <div className="ml-auto">
                {isOpen
                  ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  : <ChevronUp   className="w-3.5 h-3.5 text-slate-500" />
                }
              </div>
            </button>

            {}
            <button
              onClick={() => setShowVectors(v => !v)}
              title="Toggle force vectors"
              className="px-3 py-3 text-slate-500 hover:text-cyan-neon transition-colors"
            >
              {showVectors
                ? <Eye    className="w-3.5 h-3.5" />
                : <EyeOff className="w-3.5 h-3.5" />
              }
            </button>
          </div>

          {}
          <div className="px-3 pb-3 flex gap-2">
            <StatBadge icon={Zap}      label="KE"  value={stats.ke}  color="#00f5ff" unit="J" />
            <StatBadge icon={Activity} label="PE"  value={stats.pe}  color="#bf00ff" unit="J" />
            <StatBadge icon={Cpu}      label="FPS" value={stats.fps} color="#39ff14" />
          </div>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                key="chart-area"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="px-3 pb-4 border-t border-white/5 pt-4 space-y-4">
                  {}
                  <div>
                    <p className="text-[10px] text-slate-600 font-mono uppercase tracking-widest mb-2">
                      Kinetic &amp; Potential Energy — System Total
                    </p>
                    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="keGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#00f5ff" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00f5ff" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="peGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#bf00ff" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#bf00ff" stopOpacity={0.0} />
                          </linearGradient>
                          <filter id="glow-cyan">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke="rgba(30,48,72,0.6)" vertical={false} />
                        <XAxis dataKey="t" hide />
                        <YAxis
                          tick={{ fill: 'rgba(100,116,139,0.6)', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                          tickLine={false} axisLine={false}
                          tickFormatter={v => `${Math.round(v / 1000)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="te" name="TE"
                          stroke="#ffb347" strokeWidth={1.5} fill="none"
                          dot={false} isAnimationActive={false} />
                        <Area type="monotone" dataKey="pe" name="PE"
                          stroke="#bf00ff" strokeWidth={1} fill="url(#peGrad)"
                          dot={false} isAnimationActive={false} />
                        <Area type="monotone" dataKey="ke" name="KE"
                          stroke="#00f5ff" strokeWidth={2} fill="url(#keGrad)"
                          dot={false} isAnimationActive={false}
                          style={{ filter: 'url(#glow-cyan)' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1.5">
                      <span className="text-slate-600">Total System Energy</span>
                      <span className="text-slate-400">{(stats.ke + stats.pe).toLocaleString()} J</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: 'linear-gradient(90deg, #00f5ff, #bf00ff)',
                          boxShadow: '0 0 8px rgba(0,245,255,0.4)',
                        }}
                        animate={{ width: `${Math.min(100, ((stats.ke + stats.pe) / 16000) * 100)}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>

                  {}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-600">
                    <span>Active bodies tracked</span>
                    <span className="text-slate-400">{forceVectors.length}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  )
}
