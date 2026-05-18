/**
 * ExperimentRecorder.jsx
 *
 * Experiment Recording & Replay — records a physics simulation as a JSON
 * timeline, then replays it frame-by-frame with a scrubbing timeline.
 *
 * HOW IT WORKS
 * ─────────────
 * Recording:
 *   Every ~16 ms (≈ 60 fps) we snapshot every non-static body's
 *   { id, x, y, angle, vx, vy } from the live engine.
 *   Snapshots are stored in recordingRef (no React re-render overhead).
 *   Stop → trim to the last 10 s cap → save to state.
 *
 * Replay:
 *   We apply each snapshot to the engine via Body.setPosition / setVelocity
 *   / setAngle, then advance through the timeline via setInterval.
 *   A scrub slider maps 0‥1 → frame index.
 *
 * USAGE in RoomPage.jsx
 * ──────────────────────
 *   import ExperimentRecorder from '../components/canvas/ExperimentRecorder'
 *   // in JSX:
 *   <ExperimentRecorder engineRef={engineRef} />
 *
 * No external deps beyond what the project already has (matter-js, framer-motion,
 * lucide-react, sonner).
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Circle, Square, Play, Pause, StopCircle, SkipBack, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import Matter from 'matter-js'

const { Composite, Body } = Matter

const MAX_DURATION_MS = 10_000   // 10 s cap
const FRAME_INTERVAL_MS = 16     // ~60 fps capture

// ── Capture a single frame ────────────────────────────────────────────────────
function captureFrame(engine) {
  const bodies = Composite.allBodies(engine.world)
  return bodies
    .filter(b => !b.isStatic && b.label !== 'wall' && b.label !== 'floor')
    .map(b => ({
      id:    b.id,
      x:     b.position.x,
      y:     b.position.y,
      angle: b.angle,
      vx:    b.velocity.x,
      vy:    b.velocity.y,
    }))
}

// ── Apply a frame to the engine ───────────────────────────────────────────────
function applyFrame(engine, frame) {
  if (!frame?.length) return
  const all = Composite.allBodies(engine.world)
  frame.forEach(fb => {
    const b = all.find(body => body.id === fb.id)
    if (!b || b.isStatic) return
    Body.setPosition(b, { x: fb.x, y: fb.y })
    Body.setAngle(b, fb.angle)
    Body.setVelocity(b, { x: fb.vx, y: fb.vy })
  })
}

// ── Format ms → m:ss.t ───────────────────────────────────────────────────────
function fmtMs(ms) {
  const s = ms / 1000
  const m = Math.floor(s / 60)
  const rem = (s % 60).toFixed(1).padStart(4, '0')
  return m > 0 ? `${m}:${rem}` : `${rem}s`
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExperimentRecorder({ engineRef }) {
  // 'idle' | 'recording' | 'stopped' | 'playing' | 'paused'
  const [status, setStatus]   = useState('idle')
  const [frames, setFrames]   = useState([])       // saved recording
  const [playIdx, setPlayIdx] = useState(0)         // current replay frame
  const [scrub,   setScrub]   = useState(0)         // 0..1

  const captureTimerRef = useRef(null)
  const playTimerRef    = useRef(null)
  const recordingRef    = useRef([])                // live buffer (no re-renders)
  const recordStartRef  = useRef(0)

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    if (!engineRef.current) { toast.error('Engine not ready'); return }
    recordingRef.current = []
    recordStartRef.current = Date.now()
    setStatus('recording')
    toast('Recording started ●', { icon: '🔴', duration: 1500 })

    captureTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - recordStartRef.current
      if (elapsed > MAX_DURATION_MS) {
        stopRecording()
        return
      }
      const frame = captureFrame(engineRef.current)
      recordingRef.current.push({ ts: elapsed, bodies: frame })
    }, FRAME_INTERVAL_MS)
  }, [engineRef])

  const stopRecording = useCallback(() => {
    clearInterval(captureTimerRef.current)
    const saved = [...recordingRef.current]
    setFrames(saved)
    setPlayIdx(0)
    setScrub(0)
    setStatus('stopped')
    const dur = saved.length > 0 ? saved[saved.length - 1].ts : 0
    toast.success(`Recorded ${saved.length} frames (${fmtMs(dur)})`)
  }, [])

  // ── Playback ───────────────────────────────────────────────────────────────
  const startPlay = useCallback((fromIdx = 0) => {
    if (!frames.length || !engineRef.current) return
    let idx = fromIdx
    setStatus('playing')
    setPlayIdx(idx)

    playTimerRef.current = setInterval(() => {
      if (idx >= frames.length) {
        clearInterval(playTimerRef.current)
        setStatus('stopped')
        return
      }
      applyFrame(engineRef.current, frames[idx].bodies)
      setPlayIdx(idx)
      setScrub(idx / (frames.length - 1))
      idx++
    }, FRAME_INTERVAL_MS)
  }, [frames, engineRef])

  const pausePlay = useCallback(() => {
    clearInterval(playTimerRef.current)
    setStatus('paused')
  }, [])

  const resumePlay = useCallback(() => {
    startPlay(playIdx)
  }, [startPlay, playIdx])

  const handleScrub = useCallback((e) => {
    const val = parseFloat(e.target.value)
    setScrub(val)
    const idx = Math.round(val * (frames.length - 1))
    setPlayIdx(idx)
    if (engineRef.current && frames[idx]) {
      applyFrame(engineRef.current, frames[idx].bodies)
    }
  }, [frames, engineRef])

  const handleDiscard = useCallback(() => {
    clearInterval(playTimerRef.current)
    setFrames([])
    setPlayIdx(0)
    setScrub(0)
    setStatus('idle')
    toast('Recording discarded', { icon: '🗑', duration: 1000 })
  }, [])

  // Cleanup on unmount
  useEffect(() => () => {
    clearInterval(captureTimerRef.current)
    clearInterval(playTimerRef.current)
  }, [])

  const hasRecording = frames.length > 0
  const dur = hasRecording ? frames[frames.length - 1].ts : 0
  const currentTs = hasRecording && frames[playIdx] ? frames[playIdx].ts : 0

  return (
    <div className="w-full">
      <div
        className="toolbar-float rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,15,26,0.92)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.07)',
          minWidth: 220,
        }}
      >
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-1.5">
            <AnimatePresence mode="wait">
              {status === 'recording'
                ? (
                  <motion.span key="rec"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 rounded-full bg-red-500"
                    style={{ boxShadow: '0 0 6px rgba(239,68,68,0.9)' }}
                  />
                ) : (
                  <motion.span key="idle"
                    className="w-2 h-2 rounded-full bg-slate-600"
                  />
                )
              }
            </AnimatePresence>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              {status === 'recording' ? `REC ${fmtMs(Date.now() - recordStartRef.current)}` : 'RECORDER'}
            </span>
          </div>
          {hasRecording && (
            <span className="ml-auto text-[10px] font-mono text-slate-600">{fmtMs(dur)}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 px-2 py-2">
          {status === 'idle' || status === 'stopped' ? (
            /* Record button */
            <motion.button
              onClick={startRecording}
              whileTap={{ scale: 0.88 }}
              title="Start Recording"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all"
            >
              <Circle className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>
          ) : status === 'recording' ? (
            /* Stop button */
            <motion.button
              onClick={stopRecording}
              whileTap={{ scale: 0.88 }}
              title="Stop Recording"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all"
            >
              <StopCircle className="w-4 h-4" />
            </motion.button>
          ) : null}

          {/* Playback controls — only when there's a recording */}
          {hasRecording && status !== 'recording' && (
            <>
              {/* Rewind */}
              <motion.button
                onClick={() => { pausePlay(); setPlayIdx(0); setScrub(0); if (engineRef.current && frames[0]) applyFrame(engineRef.current, frames[0].bodies) }}
                whileTap={{ scale: 0.88 }}
                title="Go to Start"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </motion.button>

              {/* Play / Pause */}
              {status === 'playing' ? (
                <motion.button
                  onClick={pausePlay}
                  whileTap={{ scale: 0.88 }}
                  title="Pause"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-cyan-neon bg-cyan-neon/10 border border-cyan-neon/30 transition-all"
                >
                  <Pause className="w-3.5 h-3.5" />
                </motion.button>
              ) : (
                <motion.button
                  onClick={status === 'paused' ? resumePlay : () => startPlay(0)}
                  whileTap={{ scale: 0.88 }}
                  title="Play"
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-cyan-neon bg-cyan-neon/10 border border-cyan-neon/30 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                </motion.button>
              )}

              {/* Discard */}
              <motion.button
                onClick={handleDiscard}
                whileTap={{ scale: 0.88 }}
                title="Discard Recording"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            </>
          )}
        </div>

        {/* Scrub timeline — only when stopped/paused/playing */}
        {hasRecording && status !== 'recording' && (
          <div className="px-3 pb-3 space-y-1">
            {/* Custom range slider */}
            <div className="relative h-4 flex items-center">
              {/* Track */}
              <div className="absolute inset-x-0 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
              {/* Filled portion */}
              <div
                className="absolute left-0 h-1 rounded-full"
                style={{
                  width: `${scrub * 100}%`,
                  background: 'linear-gradient(90deg, #00f5ff, #bf00ff)',
                  boxShadow: '0 0 6px rgba(0,245,255,0.5)',
                }}
              />
              <input
                type="range" min="0" max="1" step="0.001"
                value={scrub}
                onChange={handleScrub}
                className="absolute inset-0 w-full opacity-0 cursor-pointer h-4"
                style={{ zIndex: 2 }}
              />
              {/* Thumb indicator */}
              <div
                className="absolute w-3 h-3 rounded-full pointer-events-none"
                style={{
                  left: `calc(${scrub * 100}% - 6px)`,
                  background: '#00f5ff',
                  boxShadow: '0 0 8px rgba(0,245,255,0.8)',
                  zIndex: 1,
                }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-600">
              <span>{fmtMs(currentTs)}</span>
              <span>{fmtMs(dur)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
