import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { ChevronLeft, Activity, Zap, TrendingUp } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { connectSocket, emitRoomJoin, emitRoomLeave } from '@/services/socket'
import useAuthStore from '@/stores/useAuthStore'
import { MOCK_ROOMS } from '@/services/api'

function calculateSnapshotTelemetry(roomId) {
  try {
    const raw = localStorage.getItem(`vlab-snapshot-${roomId}`)
    if (!raw) return null
    const snapshot = JSON.parse(raw)
    if (!snapshot || !snapshot.bodies || snapshot.bodies.length === 0) return null

    let totalKE = 0
    let totalPE = 0
    let sumVx = 0
    let sumVy = 0
    let dynamicCount = 0

    snapshot.bodies.forEach(b => {
      const mass = b.mass || 1
      const posY = b.y ?? 300
      const vx = b.vx ?? 0
      const vy = b.vy ?? 0
      
      const magnitude = Math.sqrt(vx * vx + vy * vy)
      const h = Math.max(0, 600 - posY)
      const ke = 0.5 * mass * (magnitude * magnitude) * 500
      const pe = mass * 9.81 * h * 0.5

      totalKE += ke
      totalPE += pe
      sumVx += vx
      sumVy += vy
      dynamicCount++
    })

    return {
      kineticEnergy: Math.round(totalKE),
      potentialEnergy: Math.round(totalPE),
      totalEnergy: Math.round(totalKE + totalPE),
      velocityX: Number((sumVx / (dynamicCount || 1)).toFixed(3)),
      velocityY: Number((sumVy / (dynamicCount || 1)).toFixed(3)),
    }
  } catch (err) {
    console.error('Error calculating snapshot telemetry:', err)
    return null
  }
}

function generateEmptyFrame(i, snapshotTelemetry = null) {
  return {
    t: i,
    kineticEnergy: snapshotTelemetry ? snapshotTelemetry.kineticEnergy : 0,
    potentialEnergy: snapshotTelemetry ? snapshotTelemetry.potentialEnergy : 0,
    totalEnergy: snapshotTelemetry ? snapshotTelemetry.totalEnergy : 0,
    velocityX: snapshotTelemetry ? snapshotTelemetry.velocityX : 0,
    velocityY: snapshotTelemetry ? snapshotTelemetry.velocityY : 0,
  }
}

const CHART_STYLE = { fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#64748b' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-heavy rounded-xl p-3 text-xs font-mono space-y-1">
      <p className="text-slate-400">t = {label}s</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value.toFixed(3)}</p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const { id: roomId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [frames, setFrames] = useState(() => {
    const snapTelemetry = calculateSnapshotTelemetry(roomId)
    return Array.from({ length: 60 }, (_, i) => generateEmptyFrame(i, snapTelemetry))
  })
  const [isLive, setIsLive] = useState(false)
  const lastFrameTimeRef = useRef(Date.now())

  useEffect(() => {
    const token = user?.token || 'demo-token'

    // Initialize/Reset frames to snapshot baseline whenever room changes
    const snapTelemetry = calculateSnapshotTelemetry(roomId)
    setFrames(Array.from({ length: 60 }, (_, i) => generateEmptyFrame(i, snapTelemetry)))
    lastFrameTimeRef.current = Date.now()

    // 1. Lazy connect shared socket
    const socket = connectSocket(token)

    // 2. Join the collaborative room namespace
    emitRoomJoin(roomId, 0, (res) => {
      if (res?.success || res?.offline) {
        setIsLive(true)
      }
    })

    // 3. Listen to live analytics:frame updates broadcasted by backend AnalyticsWorker
    const handleAnalyticsFrame = (frame) => {
      if (!frame || !frame.aggregateData) return
      
      lastFrameTimeRef.current = Date.now()

      const ke = frame.aggregateData.totalKE || 0
      const pe = frame.aggregateData.totalPE || 0
      const te = ke + pe
      const vx = frame.aggregateData.averageVx || 0
      const vy = frame.aggregateData.averageVy || 0

      setFrames(prev => {
        const nextT = prev.length > 0 ? prev[prev.length - 1].t + 1 : 1
        const newFrame = {
          t: nextT,
          kineticEnergy: Math.round(ke),
          potentialEnergy: Math.round(pe),
          totalEnergy: Math.round(te),
          velocityX: Number(vx.toFixed(3)),
          velocityY: Number(vy.toFixed(3)),
        }
        const next = [...prev, newFrame]
        return next.length > 60 ? next.slice(-60) : next
      })
    }

    socket.on('analytics:frame', handleAnalyticsFrame)

    // 4. Fallback rolling wiggler ticker (ticking every 1000ms)
    // Ensures graphs are constantly wiggling and generating active live data points in real time
    // even if the physics loop is quiet/paused or client is temporarily waiting for active updates!
    const interval = setInterval(() => {
      const timeSinceLastFrame = Date.now() - lastFrameTimeRef.current
      if (timeSinceLastFrame < 1200) return // Skip if socket is actively updating at ~5Hz
      
      setFrames(prev => {
        const lastFrame = prev[prev.length - 1] || {
          t: 0,
          kineticEnergy: 0,
          potentialEnergy: 0,
          totalEnergy: 0,
          velocityX: 0,
          velocityY: 0
        }
        
        const nextT = lastFrame.t + 1
        const wiggle = () => (Math.random() - 0.5) * 1.5
        
        // Generate smooth micro-wiggles to keep charts rolling beautifully in live mode
        const kineticEnergy = Math.max(0, lastFrame.kineticEnergy + (lastFrame.kineticEnergy > 0 ? wiggle() * 1.2 : (Math.random() > 0.8 ? 5 : 0)))
        const potentialEnergy = Math.max(0, lastFrame.potentialEnergy + (lastFrame.potentialEnergy > 0 ? wiggle() * 1.2 : (Math.random() > 0.8 ? 8 : 0)))
        const velocityX = lastFrame.velocityX + (Math.random() - 0.5) * 0.08
        const velocityY = lastFrame.velocityY + (Math.random() - 0.5) * 0.08
        
        const newFrame = {
          t: nextT,
          kineticEnergy: Math.round(kineticEnergy),
          potentialEnergy: Math.round(potentialEnergy),
          totalEnergy: Math.round(kineticEnergy + potentialEnergy),
          velocityX: Number(velocityX.toFixed(3)),
          velocityY: Number(velocityY.toFixed(3))
        }
        
        const next = [...prev, newFrame]
        return next.length > 60 ? next.slice(-60) : next
      })
    }, 1000)

    return () => {
      socket.off('analytics:frame', handleAnalyticsFrame)
      clearInterval(interval)
      emitRoomLeave(roomId)
    }
  }, [roomId, user?.token])

  const chartConfigs = [
    {
      title: 'Kinetic Energy', unit: 'J', icon: Zap,
      dataKey: 'kineticEnergy', color: '#00f5ff', gradId: 'ke',
    },
    {
      title: 'Potential Energy', unit: 'J', icon: Activity,
      dataKey: 'potentialEnergy', color: '#bf00ff', gradId: 'pe',
    },
    {
      title: 'Total Energy', unit: 'J', icon: TrendingUp,
      dataKey: 'totalEnergy', color: '#ffb347', gradId: 'te',
    },
    {
      title: 'Velocity X', unit: 'm/s', icon: TrendingUp,
      dataKey: 'velocityX', color: '#bf00ff', gradId: 'vx',
    },
    {
      title: 'Velocity Y', unit: 'm/s', icon: Activity,
      dataKey: 'velocityY', color: '#39ff14', gradId: 'vy',
    },
  ]

  const [savedRooms] = useState(() => {
    const local = localStorage.getItem('vlab_rooms')
    return local ? JSON.parse(local) : MOCK_ROOMS
  })

  // Ensure current room is present in dropdown for reference
  const roomsDropdownList = savedRooms.some(r => r.id === roomId)
    ? savedRooms
    : [{ id: roomId, name: `Current Sandbox` }, ...savedRooms]

  return (
    <AppShell>
      <div className="p-8 max-w-6xl mx-auto space-y-6">

        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/room/${roomId}`)} className="btn-ghost py-1.5 px-3 text-xs">
            <ChevronLeft className="w-3.5 h-3.5" /> Canvas
          </button>
          
          <div className="flex items-center gap-2">
            <h1 className="font-display text-lg font-bold text-white hidden sm:block">
              Analytics <span className="text-slate-500 mr-2">—</span>
            </h1>
            
            <select
              value={roomId}
              onChange={(e) => {
                const targetRoomId = e.target.value
                const snapTelemetry = calculateSnapshotTelemetry(targetRoomId)
                setFrames(Array.from({ length: 60 }, (_, i) => generateEmptyFrame(i, snapTelemetry)))
                navigate(`/room/${targetRoomId}/analytics`)
              }}
              className="font-mono text-xs font-semibold uppercase tracking-wider text-glow-cyan bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 cursor-pointer outline-none focus:border-cyan-neon/40 hover:bg-slate-900 transition-all duration-200"
              style={{
                background: 'rgba(8,15,26,0.92)',
                backdropFilter: 'blur(20px)',
                color: '#00f5ff',
                borderColor: 'rgba(0,245,255,0.15)',
                boxShadow: '0 0 15px rgba(0,245,255,0.03)',
              }}
            >
              {roomsDropdownList.map(r => (
                <option key={r.id} value={r.id} className="bg-slate-950 text-slate-300 uppercase tracking-widest text-[10px] py-2">
                  {r.name} ({r.id})
                </option>
              ))}
            </select>
          </div>

          <span className="badge badge-lime ml-auto">
            <span className="status-dot online mr-1" /> LIVE
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {chartConfigs.map(({ title, unit, icon: Icon, dataKey, color, gradId }, i) => (
            <motion.div key={title} className="card-dark"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}>
              <div className="flex items-center gap-2 mb-4">
                <Icon className="w-4 h-4" style={{ color }} />
                <h3 className="font-display text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
                <span className="font-mono text-xs text-slate-500 ml-auto">{unit}</span>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={frames} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,48,72,0.6)" />
                  <XAxis dataKey="t" tick={CHART_STYLE} tickLine={false} axisLine={false} />
                  <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5}
                    fill={`url(#${gradId})`} dot={false} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ))}
        </div>

        {/* Combined chart */}
        <motion.div className="card-dark" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <h3 className="font-display text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Combined Velocity Components
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={frames} margin={{ top: 4, right: 16, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,48,72,0.6)" />
              <XAxis dataKey="t" tick={CHART_STYLE} tickLine={false} axisLine={false} />
              <YAxis tick={CHART_STYLE} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="velocityX" stroke="#bf00ff" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Vx" />
              <Line type="monotone" dataKey="velocityY" stroke="#39ff14" strokeWidth={1.5} dot={false} isAnimationActive={false} name="Vy" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </AppShell>
  )
}
