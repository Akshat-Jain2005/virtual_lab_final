import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, Lock, Unlock, Trash2, ArrowLeft } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { MOCK_ROOMS } from '@/services/api'

export default function SavedRoomsPage() {
  const navigate = useNavigate()
  
  const [savedRooms, setSavedRooms] = useState(() => {
    const local = localStorage.getItem('vlab_rooms')
    return local ? JSON.parse(local) : MOCK_ROOMS
  })

  const handleDelete = (id, e) => {
    e.stopPropagation()
    const updated = savedRooms.filter(r => r.id !== id)
    setSavedRooms(updated)
    localStorage.setItem('vlab_rooms', JSON.stringify(updated))
  }

  const statusColors = { active: '#39ff14', idle: '#fbbf24', offline: '#475569' }

  return (
    <AppShell>
      <div className="p-8 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="btn-ghost p-2">
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          <h1 className="font-display text-2xl font-bold text-white">Saved Rooms</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savedRooms.map((room, i) => (
            <motion.div key={room.id} className="card-dark group cursor-pointer shine relative"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/room/${room.id}`)}
            >
              <button 
                onClick={(e) => handleDelete(room.id, e)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all z-10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2.5 mb-3 pr-8">
                <span className="status-dot" style={{ background: statusColors[room.status], boxShadow: `0 0 8px ${statusColors[room.status]}80` }} />
                <h3 className="font-semibold text-slate-100 text-sm truncate">{room.name}</h3>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>{room.users} online</span>
                </div>
                {room.isLocked ? <Lock className="w-3.5 h-3.5 text-warning" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
              </div>
            </motion.div>
          ))}
          {savedRooms.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 font-mono text-sm">
              No saved rooms found. Create one from the Dashboard!
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
