import { useState, useEffect, useRef } from 'react'

export default function useMockAnalytics(engine, isLive = true) {
  const [dataPoints, setDataPoints] = useState([])

  const [stats, setStats] = useState({ ke: 0, pe: 0, fps: 60 })

  const lastTimeRef = useRef(Date.now())
  const frameCountRef = useRef(0)

  useEffect(() => {
    if (!isLive) return

    const interval = setInterval(() => {
      
      let calculatedKE = 0
      let calculatedPE = 0
      
      if (engine && engine.world) {
        const bodies = engine.world.bodies || []
        bodies.forEach(body => {
          if (body.isStatic) return
          
          const mass = body.mass || 1
          const speed = body.speed || 0
          calculatedKE += 0.5 * mass * speed * speed * 1000 
          
          
          
          const height = Math.max(0, 800 - body.position.y)
          calculatedPE += mass * 0.1 * height * 10 
        })
      }

      
      if (calculatedKE === 0 && calculatedPE === 0) {
        setStats(prev => ({ ...prev, fps: Math.min(60, Math.max(45, currentFps)) }))
        return
      }

      
      const now = Date.now()
      frameCountRef.current++
      let currentFps = 60
      if (now - lastTimeRef.current >= 1000) {
        currentFps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current))
        frameCountRef.current = 0
        lastTimeRef.current = now
      }

      
      const nextT = dataPoints.length ? dataPoints[dataPoints.length - 1].t + 1 : 0
      const newPt = {
        t: nextT,
        ke: Math.round(calculatedKE),
        pe: Math.round(calculatedPE)
      }

      setDataPoints(prev => {
        const next = [...prev, newPt]
        if (next.length > 50) next.shift() 
        return next
      })

      setStats({
        ke: Math.round(calculatedKE),
        pe: Math.round(calculatedPE),
        fps: Math.min(60, Math.max(45, currentFps))
      })

    }, 250) 

    return () => clearInterval(interval)
  }, [engine, isLive, dataPoints.length])

  return { dataPoints, stats }
}
