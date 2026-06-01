
import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Loader2, Sparkles, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import Matter from 'matter-js'

import {
  spawnBody, spawnRope, spawnSpring, spawnPivot, spawnMotor, clearBodies,
} from './PhysicsCanvas'

const { Bodies, Body, Constraint, World, Composite } = Matter



function spawnNewtonCradle(engine, cx, cy) {
  const n = 5
  const r = 24
  const gap = r * 2 + 2
  const barY = cy
  const ballY = cy + 160
  const bar = Bodies.rectangle(cx, barY, gap * n + 40, 12, {
    isStatic: true, label: 'cradle-bar',
    render: { fillStyle: 'rgba(0,245,255,0.12)', strokeStyle: 'rgba(0,245,255,0.6)', lineWidth: 1.5 },
  })
  const balls = []
  const strings = []
  for (let i = 0; i < n; i++) {
    const x = cx - ((n - 1) / 2) * gap + i * gap
    const ball = Bodies.circle(x, ballY, r, {
      restitution: 0.999, friction: 0, frictionAir: 0.0008,
      label: 'circle',
      render: { fillStyle: 'rgba(0,245,255,0.18)', strokeStyle: 'rgba(0,245,255,0.85)', lineWidth: 2 },
    })
    balls.push(ball)
    strings.push(Constraint.create({
      bodyA: bar,  pointA: { x: x - cx, y: 6 },
      bodyB: ball, pointB: { x: 0, y: -r },
      stiffness: 0.9, damping: 0.001, length: ballY - barY - r - 6,
      render: { strokeStyle: 'rgba(0,245,255,0.4)', lineWidth: 1.5 },
    }))
  }
  
  Body.setPosition(balls[0], { x: balls[0].position.x - 100, y: balls[0].position.y - 90 })
  World.add(engine.world, [bar, ...balls, ...strings])
  return balls.length + 1
}

function spawnPendulumCollision(engine, cx, cy) {
  const barY = cy
  const armLen = 160
  const bar = Bodies.rectangle(cx, barY, 280, 12, {
    isStatic: true, label: 'pendulum-bar',
    render: { fillStyle: 'rgba(191,0,255,0.12)', strokeStyle: 'rgba(191,0,255,0.6)', lineWidth: 1.5 },
  })
  const makeSwinger = (xOffset, pullDir) => {
    const pivX = cx + xOffset
    const ball = Bodies.circle(pivX + pullDir * 100, barY + armLen, 28, {
      restitution: 0.92, friction: 0, frictionAir: 0.002,
      label: 'circle',
      render: { fillStyle: 'rgba(191,0,255,0.2)', strokeStyle: 'rgba(191,0,255,0.85)', lineWidth: 2 },
    })
    const string = Constraint.create({
      bodyA: bar,  pointA: { x: xOffset, y: 6 },
      bodyB: ball, pointB: { x: 0, y: -28 },
      stiffness: 0.9, damping: 0.001, length: armLen - 28,
      render: { strokeStyle: 'rgba(191,0,255,0.4)', lineWidth: 1.5 },
    })
    return { ball, string }
  }
  const left  = makeSwinger(-90,  1)   
  const right = makeSwinger( 90, -1)   
  World.add(engine.world, [bar, left.ball, left.string, right.ball, right.string])
  return 5
}

function spawnInclinedPlane(engine, cx, cy) {
  const ramp = Bodies.rectangle(cx, cy + 80, 320, 18, {
    isStatic: true, angle: -Math.PI / 8, label: 'ramp',
    render: { fillStyle: 'rgba(57,255,20,0.1)', strokeStyle: 'rgba(57,255,20,0.7)', lineWidth: 2 },
  })
  const ball = Bodies.circle(cx - 110, cy - 30, 24, {
    restitution: 0.4, friction: 0.05, frictionAir: 0.003,
    label: 'circle',
    render: { fillStyle: 'rgba(57,255,20,0.2)', strokeStyle: 'rgba(57,255,20,0.85)', lineWidth: 2 },
  })
  World.add(engine.world, [ramp, ball])
  return 2
}

function spawnProjectileMotion(engine, cx, cy) {
  const ball = Bodies.circle(cx - 200, cy + 80, 22, {
    restitution: 0.55, friction: 0.05, frictionAir: 0.003,
    label: 'circle',
    render: { fillStyle: 'rgba(251,191,36,0.2)', strokeStyle: 'rgba(251,191,36,0.85)', lineWidth: 2 },
  })
  Body.setVelocity(ball, { x: 12, y: -14 })
  World.add(engine.world, ball)
  return 1
}



const CX = () => window.innerWidth  / 2
const CY = () => window.innerHeight / 2

function executeActions(engine, actions) {
  let count = 0
  if (!engine) return count
  for (const action of actions) {
    const cx = action.x ?? CX()
    const cy = action.y ?? CY()
    switch (action.type) {
      case 'clear':
        clearBodies(engine); count = 0; break
      case 'spawnBody':
        if (spawnBody(engine, action.shape || 'circle', cx, cy, action.opts || {})) count++
        break
      case 'spawnRope':
        spawnRope(engine, cx, cy, action.segments || 8); count += (action.segments || 8) + 1; break
      case 'spawnSpring':
        spawnSpring(engine, cx, cy); count += 2; break
      case 'spawnPivot':
        spawnPivot(engine, cx, cy); count += 2; break
      case 'spawnMotor':
        spawnMotor(engine, cx, cy); count += 3; break
      case 'newtonCradle':
        count += spawnNewtonCradle(engine, cx, cy); break
      case 'pendulumCollision':
        count += spawnPendulumCollision(engine, cx, cy); break
      case 'inclinedPlane':
        count += spawnInclinedPlane(engine, cx, cy); break
      case 'projectileMotion':
        count += spawnProjectileMotion(engine, cx, cy); break
      default:
        break
    }
  }
  return count
}



const SYSTEM_PROMPT = `You are an AI physics lab assistant for a browser-based Matter.js virtual lab.

When a student describes an experiment or asks to set something up, respond ONLY with a JSON object (no markdown, no preamble) in this exact shape:
{
  "message": "<friendly 1-2 sentence explanation shown in the chat>",
  "actions": [ <array of action objects> ]
}

Available action types and their fields:
  { "type": "clear" }                                  — clears all bodies
  { "type": "newtonCradle",    "x": number, "y": number }
  { "type": "pendulumCollision","x": number, "y": number }
  { "type": "inclinedPlane",   "x": number, "y": number }
  { "type": "projectileMotion","x": number, "y": number }
  { "type": "spawnBody", "shape": "circle"|"rectangle"|"polygon"|"triangle", "x": number, "y": number, "opts": { "radius":number, "restitution":number, "friction":number } }
  { "type": "spawnRope",   "x": number, "y": number, "segments": number }
  { "type": "spawnSpring", "x": number, "y": number }
  { "type": "spawnPivot",  "x": number, "y": number }
  { "type": "spawnMotor",  "x": number, "y": number }

Canvas is roughly 1400×800 px. Centre is ~700,400. Top is y=0, bottom y=800.
Always include a "clear" action first unless the user says "add" or "also".
Use sensible defaults. Always output valid JSON and nothing else.`

async function askClaude(messages) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const lastMessage = messages[messages.length - 1].content.toLowerCase()

  if (!apiKey) {
    
    await new Promise(r => setTimeout(r, 800)) 

    if (lastMessage.includes('newton')) {
      return { message: "I've set up Newton's Cradle for you!", actions: [{ type: "clear" }, { type: "newtonCradle" }] }
    }
    if (lastMessage.includes('pendulum')) {
      return { message: "Here is a colliding pendulum setup.", actions: [{ type: "clear" }, { type: "pendulumCollision" }] }
    }
    if (lastMessage.includes('inclined') || lastMessage.includes('plane') || lastMessage.includes('ramp')) {
      return { message: "I've spawned an inclined plane with a rolling object.", actions: [{ type: "clear" }, { type: "inclinedPlane" }] }
    }
    if (lastMessage.includes('projectile')) {
      return { message: "Launching projectile at an angle!", actions: [{ type: "clear" }, { type: "projectileMotion" }] }
    }
    if (lastMessage.includes('spring')) {
      return { message: "I've added a spring joint to the canvas.", actions: [{ type: "clear" }, { type: "spawnSpring" }, { type: "spawnBody", shape: "circle", x: 750 }] }
    }
    
    return {
      message: "I couldn't match a specific template, but I dropped a few basic shapes for you to play with!",
      actions: [{ type: "clear" }, { type: "spawnBody", shape: "circle" }, { type: "spawnBody", shape: "rectangle", x: 600 }]
    }
  }

  
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerously-allow-browser': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })
  
  if (!res.ok) throw new Error(`API ${res.status}`)
  
  const data = await res.json()
  const raw = data.content?.find(b => b.type === 'text')?.text ?? '{}'
  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return { message: raw, actions: [] }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Set up Newton's Cradle",
  'Pendulum collision',
  'Inclined plane demo',
  'Projectile motion',
  'Add a spring system',
]

export default function AIChatBubble({ engineRef, onBodyCountChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your physics lab assistant. Describe an experiment and I'll set it up for you. Try \"Newton's Cradle\" or \"pendulum collision\"!" }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  // API message history (role: user | assistant, content: string)
  const historyRef = useRef([])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: trimmed }])
    setLoading(true)

    historyRef.current.push({ role: 'user', content: trimmed })

    try {
      const result = await askClaude(historyRef.current)
      historyRef.current.push({ role: 'assistant', content: result.message || '' })

      // Execute physics actions
      if (result.actions?.length) {
        const added = executeActions(engineRef.current, result.actions)
        if (onBodyCountChange) onBodyCountChange(c => c + added)
      }

      setMessages(prev => [...prev, { role: 'assistant', text: result.message || 'Done!' }])
    } catch (err) {
      toast.error('AI assistant error — check console')
      console.error('[AIChatBubble]', err)
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠️ Could not reach AI. Make sure the API is configured.' }])
    } finally {
      setLoading(false)
    }
  }, [loading, engineRef, onBodyCountChange])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  return (
    <>
      {}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileTap={{ scale: 0.9 }}
        className="absolute bottom-12 left-[17rem] z-40 w-11 h-11 rounded-2xl flex items-center justify-center"
        style={{
          background: isOpen
            ? 'linear-gradient(135deg, rgba(0,245,255,0.25), rgba(191,0,255,0.15))'
            : 'rgba(8,15,26,0.92)',
          border: `1px solid ${isOpen ? 'rgba(0,245,255,0.5)' : 'rgba(255,255,255,0.07)'}`,
          backdropFilter: 'blur(20px)',
          boxShadow: isOpen ? '0 0 20px rgba(0,245,255,0.3)' : '0 4px 20px rgba(0,0,0,0.5)',
        }}
        title="AI Experiment Assistant"
      >
        {isOpen
          ? <X className="w-4 h-4 text-cyan-neon" />
          : (
            <>
              <Bot className="w-4 h-4 text-cyan-400" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 flex items-center justify-center">
                <Sparkles className="w-2 h-2 text-void" />
              </span>
            </>
          )
        }
      </motion.button>

      {}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="absolute bottom-28 left-[17rem] z-40 w-80 flex flex-col"
            style={{
              height: 380,
              background: 'rgba(8,15,26,0.95)',
              backdropFilter: 'blur(24px) saturate(180%)',
              border: '1px solid rgba(0,245,255,0.15)',
              borderRadius: 16,
              boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,245,255,0.05)',
            }}
          >
            {}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(0,245,255,0.3), rgba(191,0,255,0.2))' }}>
                <Bot className="w-3.5 h-3.5 text-cyan-neon" />
              </div>
              <span className="text-xs font-mono font-semibold text-slate-300 tracking-wider">AI LAB ASSISTANT</span>
              <span className="ml-auto flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] text-cyan-400 font-mono">CLAUDE</span>
              </span>
            </div>

            {}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-thin">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                    style={msg.role === 'user'
                      ? { background: 'rgba(0,245,255,0.12)', border: '1px solid rgba(0,245,255,0.25)', color: '#e2e8f0' }
                      : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }
                    }
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-3 py-2 flex items-center gap-1.5"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
                    <span className="text-[10px] text-slate-500 font-mono">Thinking…</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {}
            {messages.length <= 1 && (
              <div className="px-3 pb-1 flex flex-wrap gap-1">
                {SUGGESTIONS.map(s => (
                  <button key={s}
                    onClick={() => send(s)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full transition-colors"
                    style={{ background: 'rgba(0,245,255,0.07)', border: '1px solid rgba(0,245,255,0.2)', color: 'rgba(0,245,255,0.7)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {}
            <div className="px-3 pb-3 pt-2 border-t border-white/5 flex items-center gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Describe an experiment…"
                disabled={loading}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 outline-none focus:border-cyan-neon/40 focus:bg-white/7 transition-all"
              />
              <motion.button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                whileTap={{ scale: 0.88 }}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: input.trim() && !loading ? 'rgba(0,245,255,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${input.trim() && !loading ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.07)'}`,
                  color: input.trim() && !loading ? '#00f5ff' : '#475569',
                }}
              >
                <Send className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
