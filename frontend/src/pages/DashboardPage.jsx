import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Users, Beaker, TrendingUp, Clock, Lock, Unlock,
  ArrowRight, Zap, BarChart3, BookOpen, Activity, X, Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import useAuthStore from '@/stores/useAuthStore'
import { MOCK_ROOMS, MOCK_PROJECTS } from '@/services/api'
import AppShell from '@/components/layout/AppShell'

const STATS = [
  { label: 'Active Rooms',    value: '4',   icon: Zap,       color: 'cyan'  },
  { label: 'Experiments',     value: '24',  icon: Beaker,    color: 'violet'},
  { label: 'Collaborators',   value: '12',  icon: Users,     color: 'lime'  },
  { label: 'Avg Session',     value: '47m', icon: Clock,     color: 'cyan'  },
]

function StatCard({ label, value, icon: Icon, color, delay }) {
  const colors = {
    cyan:   { text: 'text-cyan-neon',  bg: 'rgba(0,245,255,0.08)',   border: 'rgba(0,245,255,0.15)',   glow: 'glow-sm' },
    violet: { text: 'text-violet-400', bg: 'rgba(191,0,255,0.08)',   border: 'rgba(191,0,255,0.15)',   glow: 'glow-violet' },
    lime:   { text: 'text-lime-neon',  bg: 'rgba(57,255,20,0.08)',   border: 'rgba(57,255,20,0.15)',   glow: 'glow-lime' },
  }
  const c = colors[color]

  return (
    <motion.div className="card-dark shine"
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">{label}</p>
          <p className={`text-3xl font-display font-bold ${c.text}`}>{value}</p>
        </div>
        <div className="p-2.5 rounded-xl" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      </div>
    </motion.div>
  )
}

function RoomCard({ room, onJoin, onDelete, onToggleLock, delay }) {
  const statusColors = { active: '#39ff14', idle: '#fbbf24', offline: '#475569' }
  return (
    <motion.div className="card-dark group cursor-pointer shine relative"
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      onClick={() => onJoin(room.id)}
    >
      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(room.id) }}
          className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all z-10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="flex items-center justify-between mb-3 pr-8">
        <div className="flex items-center gap-2.5">
          <span className="status-dot" style={{ background: statusColors[room.status], boxShadow: `0 0 8px ${statusColors[room.status]}80` }} />
          <h3 className="font-semibold text-slate-100 text-sm truncate">{room.name}</h3>
        </div>
        <button 
          onClick={(e) => { 
            e.stopPropagation()
            if (onToggleLock) onToggleLock(room.id)
          }}
          className="hover:scale-110 transition-transform"
          title={room.isLocked ? 'Unlock Room' : 'Lock Room'}
        >
          {room.isLocked
            ? <Lock className="w-3.5 h-3.5 text-warning drop-shadow-md" />
            : <Unlock className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
          }
        </button>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-500">
          <Users className="w-3.5 h-3.5" />
          <span>{room.users} online</span>
        </div>
        <span className={`badge ${room.status === 'active' ? 'badge-lime' : room.status === 'idle' ? 'badge-cyan' : ''}`}>
          {room.status}
        </span>
      </div>
    </motion.div>
  )
}

function ProjectCard({ project, onOpen, delay }) {
  return (
    <motion.div className="card-dark group cursor-pointer shine"
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      onClick={() => onOpen(project.id)}
    >
      <div className="text-3xl mb-3">{project.thumbnail}</div>
      <h3 className="font-semibold text-slate-100 text-sm mb-1">{project.name}</h3>
      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{project.description}</p>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex gap-3">
          <span>⭐ {project.starsCount}</span>
          <span>🔀 {project.forksCount}</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-cyan-neon transition-opacity" />
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [savedRooms, setSavedRooms] = useState(() => {
    const local = localStorage.getItem('vlab_rooms')
    return local ? JSON.parse(local) : MOCK_ROOMS
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomCode, setNewRoomCode] = useState('')
  const [newRoomTags, setNewRoomTags] = useState([])

  const handleJoinRoom = (roomId) => {
    navigate(`/room/${roomId}`)
  }

  const handleDeleteRoom = (roomId) => {
    const updated = savedRooms.filter(r => r.id !== roomId)
    setSavedRooms(updated)
    localStorage.setItem('vlab_rooms', JSON.stringify(updated))
    toast.success('Room deleted successfully', { icon: '🗑️' })
  }

  const handleToggleLock = (roomId) => {
    const updated = savedRooms.map(r => {
      if (r.id === roomId) {
        const isNowLocked = !r.isLocked
        toast.success(`Room ${isNowLocked ? 'locked' : 'unlocked'}`, { icon: isNowLocked ? '🔒' : '🔓' })
        return { ...r, isLocked: isNowLocked }
      }
      return r
    })
    setSavedRooms(updated)
    localStorage.setItem('vlab_rooms', JSON.stringify(updated))
  }

  const handleCreateRoomSubmit = (e) => {
    e.preventDefault()
    if (!newRoomName || !newRoomCode) {
      return toast.error('Please fill in both fields', { icon: '⚠️' })
    }
    
    
    const roomId = newRoomCode.trim().toLowerCase().replace(/\s+/g, '-')
    
    
    const newRoom = {
      id: roomId,
      name: newRoomName,
      users: 1,
      status: 'active',
      isLocked: false
    }
    const updatedRooms = [newRoom, ...savedRooms]
    setSavedRooms(updatedRooms)
    localStorage.setItem('vlab_rooms', JSON.stringify(updatedRooms))

    
    const libKey = `vlab-experiment-${Date.now()}`
    const experimentSnapshot = {
      name: newRoomName,
      tags: newRoomTags,
      isPublic: true,
      snapshot: {
        version: 1,
        savedAt: new Date().toISOString(),
        gravity: { x: 0, y: 1 },
        bodies: [],
        constraints: []
      }
    }
    localStorage.setItem(libKey, JSON.stringify(experimentSnapshot))

    toast.success(`Room "${newRoomName}" created successfully!`, { icon: '✅' })
    setIsModalOpen(false)
    navigate(`/room/${roomId}`)
  }

  const greetingHour = new Date().getHours()
  const greeting = greetingHour < 12 ? 'Good morning' : greetingHour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <AppShell>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">

        {}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-slate-500 text-sm mb-0.5">{greeting},</p>
          <h1 className="font-display text-2xl font-bold text-white">
            {user?.displayName || user?.username || 'Researcher'}
          </h1>
        </motion.div>

        {}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.08} />)}
        </div>

        {}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                Active Rooms
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate('/rooms')} className="btn-ghost py-1 px-2 text-[10px] uppercase tracking-widest text-cyan-neon">
                  View All
                </button>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary py-1.5 px-3 text-xs">
                  <Plus className="w-3.5 h-3.5" /> New Room
                </button>
              </div>
            </div>
            {savedRooms.slice(0, 4).map((r, i) =>
              <RoomCard key={r.id} room={r} onJoin={handleJoinRoom} onDelete={handleDeleteRoom} onToggleLock={handleToggleLock} delay={0.1 + i * 0.07} />
            )}
          </div>

          {}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold text-slate-300 uppercase tracking-widest">
                Recent Experiments
              </h2>
              <button onClick={() => navigate('/library')} className="btn-ghost py-1.5 px-3 text-xs">
                <BookOpen className="w-3.5 h-3.5" /> Library
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MOCK_PROJECTS.slice(0, 4).map((p, i) =>
                <ProjectCard key={p.id} project={p}
                  onOpen={id => navigate(`/library/${id}`)} delay={0.15 + i * 0.07} />
              )}
            </div>
          </div>
        </div>

        {}
        <motion.div className="glass rounded-2xl p-5 flex flex-wrap gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
          <span className="text-xs text-slate-500 self-center mr-2 font-semibold uppercase tracking-widest">Quick access</span>
          {[
            { label: 'Analytics',   icon: BarChart3, path: '/room/room-alpha-01/analytics' },
            { label: 'Library',     icon: BookOpen,  path: '/library' },
            { label: 'My Profile',  icon: Users,     path: '/profile' },
            { label: 'Admin',       icon: Activity,  path: '/admin/metrics' },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.path)} className="btn-ghost py-1.5 px-3 text-xs">
              <a.icon className="w-3.5 h-3.5" /> {a.label}
            </button>
          ))}
        </motion.div>
      </div>

      {}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="card-dark w-full max-w-md relative overflow-hidden"
              style={{
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,245,255,0.1)'
              }}
            >
              {}
              <div className="flex items-center justify-between p-5 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,245,255,0.1)' }}>
                    <Plus className="w-4 h-4 text-cyan-neon" />
                  </div>
                  <h2 className="font-semibold text-slate-100">Create New Room</h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {}
              <form onSubmit={handleCreateRoomSubmit} className="p-5 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Room Name</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Kinematics Lab 101"
                    className="input-dark w-full"
                    autoFocus
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Room Code</label>
                  <input
                    type="text"
                    value={newRoomCode}
                    onChange={(e) => setNewRoomCode(e.target.value)}
                    placeholder="e.g. alpha-42"
                    className="input-dark w-full"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Collaborators will need this code to join your room.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {['mechanics', 'oscillation', 'kinematics', 'momentum', 'fluids', 'elasticity', 'rotation'].map(t => (
                      <button key={t} type="button" onClick={() => setNewRoomTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                        className={`badge text-[10px] py-1 px-2 cursor-pointer transition-all ${
                          newRoomTags.includes(t) ? 'badge-cyan' : 'bg-surface text-slate-500 border border-border hover:border-slate-500'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn-ghost flex-1 py-2">
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1 py-2 shadow-lg shadow-cyan-neon/20">
                    Create Room
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  )
}
