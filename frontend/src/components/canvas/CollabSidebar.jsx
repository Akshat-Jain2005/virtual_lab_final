import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, MessageSquare, ChevronRight, ChevronLeft,
  Share2, Send, Lock, Unlock,
} from 'lucide-react'
import { toast } from 'sonner'


const MOCK_PEERS = [
  { id: '1', username: 'Alex Kim',      color: '#00f5ff', isOnline: true,  role: 'owner' },
  { id: '2', username: 'Sarah Chen',    color: '#bf00ff', isOnline: true,  role: 'editor' },
  { id: '3', username: 'Jordan Blake',  color: '#39ff14', isOnline: true,  role: 'viewer' },
  { id: '4', username: 'Maya Patel',    color: '#fbbf24', isOnline: false, role: 'editor' },
]

const MOCK_CHAT = [
  { id: 'm1', userId: '2', username: 'Sarah',  text: 'Added spring joint to the pendulum!', ts: '2m ago', color: '#bf00ff' },
  { id: 'm2', userId: '3', username: 'Jordan', text: 'Restitution at 0.9 looks insane 🔥',  ts: '1m ago', color: '#39ff14' },
  { id: 'm3', userId: '1', username: 'Alex',   text: 'Check the energy graph — perfect sine', ts: '45s ago', color: '#00f5ff' },
]

function Avatar({ name, color, size = 'sm' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm'
  return (
    <div
      className={`${sz} rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-void`}
      style={{ background: color }}
    >
      {name[0].toUpperCase()}
    </div>
  )
}

import { useParams } from 'react-router-dom'
import { getSocket } from '../../services/socket'

export default function CollabSidebar({ isLocked, onToggleLock, socketReady }) {
  const { id: roomId } = useParams()
  const [isOpen, setIsOpen] = useState(true)
  const [chatMessages, setChatMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const chatEndRef = useRef(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (!socketReady) return
    const socket = getSocket()
    if (!socket) return

    const onMessage = (msg) => {
      setChatMessages(prev => {
        
        if (prev.find(m => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    }

    socket.on('chat:message-received', onMessage)
    return () => socket.off('chat:message-received', onMessage)
  }, [socketReady])

  const handleSendMessage = () => {
    const text = inputValue.trim()
    if (!text) return
    
    const socket = getSocket()
    if (socket && socketReady) {
      socket.emit('chat:message', {
        roomId,
        text,
        username: 'You',
        color: '#00f5ff'
      })
    } else {
      
      setChatMessages(prev => [...prev, {
        id: `m${Date.now()}`,
        userId: 'me',
        username: 'You',
        text,
        ts: 'just now',
        color: '#00f5ff',
      }])
    }
    setInputValue('')
  }

  const handleShare = () => {
    const url = window.location.href
    navigator.clipboard?.writeText(url).catch(() => {})
    toast.success('Invite link copied!', {
      description: 'Share this link to invite collaborators.',
      duration: 3000,
      icon: '🔗',
    })
  }

  const onlineCount = MOCK_PEERS.filter(p => p.isOnline).length

  return (
    <div className="absolute right-4 top-20 bottom-[18rem] z-30 flex items-stretch">
      {/* Collapse toggle */}
      <div className="flex flex-col justify-center mr-2">
        <motion.button
          onClick={() => setIsOpen(v => !v)}
          className="toolbar-float w-6 h-12 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-200 transition-colors"
          whileTap={{ scale: 0.9 }}
        >
          {isOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sidebar"
            initial={{ x: 80, opacity: 0, width: 0 }}
            animate={{ x: 0, opacity: 1, width: 240 }}
            exit={{ x: 80, opacity: 0, width: 0 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="toolbar-float flex flex-col overflow-hidden"
            style={{ width: 240 }}
          >
            {/* ── Online Users ── */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  Online
                  <span className="bg-lime-neon/20 text-lime-neon rounded-full px-1.5 text-[10px]">
                    {onlineCount}
                  </span>
                </h3>
                <button
                  onClick={onToggleLock}
                  className="text-slate-500 hover:text-warning transition-colors"
                  title={isLocked ? 'Unlock room' : 'Lock room'}
                >
                  {isLocked
                    ? <Lock className="w-3.5 h-3.5 text-warning" />
                    : <Unlock className="w-3.5 h-3.5" />
                  }
                </button>
              </div>

              <div className="space-y-2">
                {MOCK_PEERS.map((peer, i) => (
                  <motion.div
                    key={peer.id}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="relative">
                      <Avatar name={peer.username} color={peer.color} />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0d1826] status-dot ${peer.isOnline ? 'online' : 'offline'}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${peer.isOnline ? 'text-slate-200' : 'text-slate-600'}`}>
                        {peer.username}
                      </p>
                      <p className="text-[10px] text-slate-600 capitalize">{peer.role}</p>
                    </div>
                    {peer.role === 'owner' && (
                      <span className="badge badge-cyan text-[9px] px-1.5">owner</span>
                    )}
                  </motion.div>
                ))}
              </div>

              {}
              <motion.button
                onClick={handleShare}
                whileTap={{ scale: 0.96 }}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium
                  text-cyan-neon bg-cyan-neon/8 border border-cyan-neon/20 hover:bg-cyan-neon/15 transition-all duration-150"
                style={{ boxShadow: '0 0 12px rgba(0,245,255,0.1)' }}
              >
                <Share2 className="w-3.5 h-3.5" />
                Share Room
              </motion.button>
            </div>

            {}
            <div className="flex flex-col flex-1 min-h-0 p-4">
              <h3 className="font-display text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                <MessageSquare className="w-3 h-3" />
                Chat
              </h3>

              <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-0.5">
                {chatMessages.map(msg => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs"
                  >
                    <div className="flex items-baseline gap-1.5 mb-0.5">
                      <span className="font-semibold" style={{ color: msg.color }}>
                        {msg.username}
                      </span>
                      <span className="text-slate-700 text-[10px]">{msg.ts}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{msg.text}</p>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {}
              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Message..."
                  className="input-dark flex-1 text-xs py-2 px-3 min-w-0"
                />
                <motion.button
                  onClick={handleSendMessage}
                  whileTap={{ scale: 0.9 }}
                  disabled={!inputValue.trim()}
                  className="w-9 h-9 rounded-xl flex items-center justify-center bg-cyan-neon/15 text-cyan-neon
                    hover:bg-cyan-neon/25 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
