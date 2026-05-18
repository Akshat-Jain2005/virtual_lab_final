import { useState, useEffect, useRef } from 'react'

export default function useMockAnalytics(engine, isLive = true) {
  const [dataPoints, setDataPoints] = useState(() => {
    // Generate initial beautiful historic data
    const pts = []
    for (let i = 0; i < 30; i++) {
      const t = i
      const ke = 4000 + Math.sin(i * 0.4) * 1500 + Math.random() * 400
      const pe = 6000 + Math.cos(i * 0.4) * 1500 + Math.random() * 400
      pts.push({ t, ke, pe })
    }
    return pts
  })

  const [stats, setStats] = useState({
    ke: 5000,
    pe: 6000,
    fps: 60
  })

  const lastTimeRef = useRef(Date.now())
  const frameCountRef = useRef(0)

  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(() => {
      // Calculate real kinetic and potential energy if matter-js engine exists
      let calculatedKE = 0
      let calculatedPE = 0
      
      if (engine && engine.world) {
        const bodies = engine.world.bodies || []
        bodies.forEach(body => {
          if (body.isStatic) return
          // KE = 0.5 * m * v^2
          const mass = body.mass || 1
          const speed = body.speed || 0
          calculatedKE += 0.5 * mass * speed * speed * 1000 // scale for visual impact
          
          // PE = m * g * h (approximate h using canvas height - y coordinate)
          // Assume screen height is 800
          const height = Math.max(0, 800 - body.position.y)
          calculatedPE += mass * 0.1 * height * 10 // scale for visual impact
        })
      }

      // If no active moving bodies, fallback to high fidelity animation curves
      if (calculatedKE === 0) {
        const i = Date.now() / 1000
        calculatedKE = 4500 + Math.sin(i * 1.5) * 2000 + Math.random() * 200
        calculatedPE = 5500 + Math.cos(i * 1.5) * 1500 + Math.random() * 200
      }

      // Calculate smooth FPS
      const now = Date.now()
      frameCountRef.current++
      let currentFps = 60
      if (now - lastTimeRef.current >= 1000) {
        currentFps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current))
        frameCountRef.current = 0
        lastTimeRef.current = now
      }

      // Update values
      const nextT = dataPoints.length ? dataPoints[dataPoints.length - 1].t + 1 : 0
      const newPt = {
        t: nextT,
        ke: Math.round(calculatedKE),
        pe: Math.round(calculatedPE)
      }

      setDataPoints(prev => {
        const next = [...prev, newPt]
        if (next.length > 50) next.shift() // Cap list for performance
        return next
      })

      setStats({
        ke: Math.round(calculatedKE),
        pe: Math.round(calculatedPE),
        fps: Math.min(60, Math.max(45, currentFps))
      })

    }, 250) // Update 4 times a second for fluid charts

    return () => clearInterval(interval)
  }, [engine, isLive, dataPoints.length])

  return { dataPoints, stats }
}
