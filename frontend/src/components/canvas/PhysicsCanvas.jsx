import { useEffect, useRef, useCallback } from 'react'
import Matter from 'matter-js'

const {
  Engine, Render, Runner, World, Bodies, Body, Constraint,
  Mouse, MouseConstraint, Events, Composite,
} = Matter


if (typeof window !== 'undefined') window.Matter = Matter


function createInitialBodies(width, height) {
  const wallOpts = {
    isStatic: true,
    render: { fillStyle: 'transparent', strokeStyle: 'transparent' },
    label: 'boundary',
  }

  const floor = Bodies.rectangle(width / 2, height - 20, width * 2, 40, {
    isStatic: true, label: 'floor', friction: 0.4,
    render: {
      fillStyle: 'rgba(0,245,255,0.04)',
      strokeStyle: 'rgba(0,245,255,0.2)',
      lineWidth: 1,
    },
  })

  const wallLeft  = Bodies.rectangle(-25, height / 2, 50, height * 2, wallOpts)
  const wallRight = Bodies.rectangle(width + 25, height / 2, 50, height * 2, wallOpts)
  const ceiling   = Bodies.rectangle(width / 2, -25, width * 2, 50, wallOpts)

  const shapeOpts = (fill, stroke) => ({
    restitution: 0.78, friction: 0.08, frictionAir: 0.008,
    render: { fillStyle: fill, strokeStyle: stroke, lineWidth: 1.5 },
  })

  const circle = Bodies.circle(
    width * 0.35, height * 0.2, 36,
    { ...shapeOpts('rgba(0,245,255,0.2)', 'rgba(0,245,255,0.8)'), label: 'circle' }
  )
  const rect = Bodies.rectangle(
    width * 0.5, height * 0.15, 90, 55,
    { ...shapeOpts('rgba(191,0,255,0.2)', 'rgba(191,0,255,0.8)'), label: 'rectangle' }
  )
  Body.setAngle(rect, 0.3)

  const poly = Bodies.polygon(
    width * 0.65, height * 0.12, 6, 40,
    { ...shapeOpts('rgba(57,255,20,0.2)', 'rgba(57,255,20,0.8)'), label: 'polygon' }
  )

  return [floor, wallLeft, wallRight, ceiling, circle, rect, poly]
}


export default function PhysicsCanvas({ engineRef: externalEngineRef, onBodyClick, onEngineReady, onBodyGrab, onBodyRelease }) {
  const mountRef    = useRef(null)
  const internalRef = useRef({})

  const handleResize = useCallback(() => {
    const { render } = internalRef.current
    if (!render) return
    const w = window.innerWidth
    const h = window.innerHeight
    render.canvas.width  = w
    render.canvas.height = h
    render.options.width  = w
    render.options.height = h
    Render.lookAt(render, { min: { x: 0, y: 0 }, max: { x: w, y: h } })
  }, [])

  useEffect(() => {
    const container = mountRef.current
    if (!container) return

    const w = window.innerWidth
    const h = window.innerHeight

    const engine = Engine.create({ 
      gravity: { x: 0, y: 1.2 },
      constraintIterations: 10,
      positionIterations: 10,
    })

    const render = Render.create({
      element: container,
      engine,
      options: {
        width: w, height: h,
        background: 'transparent',
        wireframes: false,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
      },
    })
    render.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'

    const runner = Runner.create()
    Runner.run(runner, engine)
    Render.run(render)

    
    const mouse = Mouse.create(render.canvas)
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.2,
        damping: 0.1,
        render: {
          visible: true,
          strokeStyle: 'rgba(0,245,255,0.5)',
          lineWidth: 2,
        },
      },
    })
    World.add(engine.world, mouseConstraint)
    render.mouse = mouse

    
    Events.on(engine, 'beforeUpdate', () => {
      const isZeroGravity = engine.gravity.y === 0 && engine.gravity.x === 0
      const ropeBodies = Composite.allBodies(engine.world).filter(b => b.label?.startsWith('rope'))

      if (isZeroGravity) {
        
        ropeBodies.forEach(b => {
          b.collisionFilter.mask = 0
        })

        const draggedBody = mouseConstraint.body
        if (draggedBody && draggedBody.label?.startsWith('rope')) {
          const ropeGroup = draggedBody.collisionFilter?.group
          if (ropeGroup) {
            const currentRope = ropeBodies.filter(b => b.collisionFilter?.group === ropeGroup)
            
            currentRope.sort((a, b) => a.position.y - b.position.y)
            const draggedIdx = currentRope.indexOf(draggedBody)
            const segLen = 12
            const mx = draggedBody.position.x
            const my = draggedBody.position.y
            
            currentRope.forEach((b, i) => {
              if (b !== draggedBody) {
                Body.setPosition(b, {
                  x: mx,
                  y: my + (i - draggedIdx) * segLen
                })
                Body.setVelocity(b, { x: 0, y: 0 })
                Body.setAngle(b, 0)
                Body.setAngularVelocity(b, 0)
              }
            })
          }
        } else if (!draggedBody) {
          
          const groups = {}
          ropeBodies.forEach(b => {
            const g = b.collisionFilter?.group
            if (g) {
              if (!groups[g]) groups[g] = []
              groups[g].push(b)
            }
          })
          
          Object.values(groups).forEach(currentRope => {
            currentRope.sort((a, b) => a.position.y - b.position.y)
            const root = currentRope[0]
            if (root) {
              const mx = root.position.x
              const my = root.position.y
              const segLen = 12
              
              currentRope.forEach((b, i) => {
                Body.setPosition(b, {
                  x: mx,
                  y: my + i * segLen
                })
                Body.setVelocity(b, { x: 0, y: 0 })
                Body.setAngle(b, 0)
                Body.setAngularVelocity(b, 0)
              })
            }
          })
        }
      } else {
        
        ropeBodies.forEach(b => {
          if (b.collisionFilter.mask === 0) {
            b.collisionFilter.mask = 0xFFFFFFFF
          }
        })
      }
    })

    World.add(engine.world, createInitialBodies(w, h))

    Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair
        
        const isAEnd = bodyA.label === 'rope-end' || bodyA.label === 'spring-end'
        const isBEnd = bodyB.label === 'rope-end' || bodyB.label === 'spring-end'
        
        if (isAEnd || isBEnd) {
          const endBody = isAEnd ? bodyA : bodyB
          const other = isAEnd ? bodyB : bodyA
          
          const isSelfGroup = endBody.collisionFilter?.group && 
            other.collisionFilter?.group && 
            endBody.collisionFilter.group === other.collisionFilter.group
            
          const isEligible = other.label !== 'boundary' && 
            other.label !== 'floor' && 
            !isSelfGroup
          
          if (isEligible) {
            const existing = Composite.allConstraints(engine.world).find(c => 
              (c.bodyA === endBody && c.bodyB === other) || (c.bodyA === other && c.bodyB === endBody)
            )
            
            if (!existing) {
              const hasSnap = Composite.allConstraints(engine.world).some(c => 
                c.label === 'snap-joint' && (c.bodyA === endBody || c.bodyB === endBody)
              )
              
              if (!hasSnap) {
                const strokeColor = endBody.label === 'spring-end' ? 'rgba(57,255,20,0.85)' : 'rgba(251,191,36,0.85)'
                const newConstraint = Constraint.create({
                  bodyA: endBody,
                  bodyB: other,
                  pointA: { x: 0, y: 0 },
                  pointB: { 
                    x: endBody.position.x - other.position.x, 
                    y: endBody.position.y - other.position.y 
                  },
                  stiffness: 0.95,
                  length: 0,
                  label: 'snap-joint',
                  render: { strokeStyle: strokeColor, lineWidth: 2 }
                })
                World.add(engine.world, newConstraint)
              }
            }
          }
        }
      })
    })

    if (onBodyClick) {
      Events.on(mouseConstraint, 'mouseup', (e) => {
        const body = e.source?.body
        if (body && body.label !== 'boundary' && body.label !== 'floor') {
          onBodyClick(body)
        }
      })
    }

    if (onBodyGrab) {
      Events.on(mouseConstraint, 'startdrag', (e) => {
        if (e.body && e.body.label !== 'boundary' && e.body.label !== 'floor') {
          onBodyGrab(e.body)
        }
      })
    }

    Events.on(mouseConstraint, 'enddrag', (e) => {
      const body = e.body
      if (body && body.label !== 'boundary' && body.label !== 'floor') {
        
        
        const allBodies = Composite.allBodies(engine.world).filter(b => 
          b !== body && b.label !== 'boundary' && b.label !== 'floor'
        )
        
        
        const overlaps = allBodies.filter(b => window.Matter.Bounds.overlaps(body.bounds, b.bounds))
        if (overlaps.length > 0) {
          const target = overlaps[0]
          
           const isRopeOrSpringA = body.label && (body.label === 'rope-segment' || body.label === 'rope-end' || body.label === 'spring-end')
          const isRopeOrSpringB = target.label && (target.label === 'rope-segment' || target.label === 'rope-end' || target.label === 'spring-end')
          if (isRopeOrSpringA || isRopeOrSpringB) {
            const snapBody = isRopeOrSpringA ? body : target
            const other = isRopeOrSpringA ? target : body
            
            const isSelfGroup = snapBody.collisionFilter?.group && 
              other.collisionFilter?.group && 
              snapBody.collisionFilter.group === other.collisionFilter.group
              
            if (!isSelfGroup) {
              
              const existing = Composite.allConstraints(engine.world).find(c => 
                (c.bodyA === body && c.bodyB === target) || (c.bodyA === target && c.bodyB === body)
              )
              
              if (!existing) {
                const hasSnap = Composite.allConstraints(engine.world).some(c => 
                  c.label === 'snap-joint' && (c.bodyA === snapBody || c.bodyB === snapBody)
                )
                
                if (!hasSnap) {
                  const strokeColor = snapBody.label === 'spring-end' ? 'rgba(57,255,20,0.85)' : 'rgba(251,191,36,0.85)'
                  
                  const newConstraint = Constraint.create({
                    bodyA: snapBody,
                    bodyB: other,
                    pointA: { x: 0, y: 0 },
                    
                    pointB: { 
                      x: snapBody.position.x - other.position.x, 
                      y: snapBody.position.y - other.position.y 
                    },
                    stiffness: 0.9,
                    length: 0,
                    label: 'snap-joint',
                    render: { strokeStyle: strokeColor, lineWidth: 2 }
                  })
                  World.add(engine.world, newConstraint)
                }
              }
            }
          }
        }

        if (onBodyRelease) {
          onBodyRelease(body)
        }
      }
    })

    internalRef.current = { engine, render, runner, mouse, mouseConstraint }

    
    if (externalEngineRef) externalEngineRef.current = engine
    if (onEngineReady) onEngineReady(engine)

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      Events.off(mouseConstraint)
      Runner.stop(runner)
      Render.stop(render)
      if (render.canvas) {
        render.canvas.remove()
        render.canvas = null
        render.context = null
        render.textures = {}
      }
      World.clear(engine.world)
      Engine.clear(engine)
      internalRef.current = {}
      if (externalEngineRef) externalEngineRef.current = null
    }
  }, []) 

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 overflow-hidden"
      style={{ cursor: 'crosshair' }}
    />
  )
}


export function spawnBody(engine, type, x, y, options = {}) {
  if (!engine) return null

  const base = {
    restitution: options.restitution ?? 0.72,
    friction:    options.friction    ?? 0.1,
    frictionAir: 0.008,
    isStatic:    options.isStatic    ?? false,
    label:       options.label       ?? type,
    render: {
      fillStyle:   options.fillStyle   ?? 'rgba(0,245,255,0.18)',
      strokeStyle: options.strokeStyle ?? 'rgba(0,245,255,0.75)',
      lineWidth: 1.5,
    },
  }

  let body
  switch (type) {
    case 'circle':
      body = Bodies.circle(x, y, options.radius ?? 36, base)
      break
    case 'rectangle':
      body = Bodies.rectangle(x, y, options.w ?? 80, options.h ?? 60, base)
      break
    case 'polygon':
      body = Bodies.polygon(x, y, options.sides ?? 6, options.radius ?? 36, base)
      break
    case 'triangle':
      body = Bodies.polygon(x, y, 3, options.radius ?? 40, {
        ...base,
        render: { ...base.render, fillStyle: 'rgba(251,191,36,0.2)', strokeStyle: 'rgba(251,191,36,0.8)' },
      })
      break
    default:
      body = Bodies.rectangle(x, y, 80, 60, base)
  }

  World.add(engine.world, body)
  return body
}


export function spawnRope(engine, x, y, segments = 8) {
  if (!engine) return null

  const segRad = 6
  const segLen = 12 
  const group  = Body.nextGroup(true)
  const bodies = []
  const constraints = []

  for (let i = 0; i < segments; i++) {
    const isEnd = (i === 0 || i === segments - 1)
    const seg = Bodies.circle(x, y + i * segLen, segRad, {
      friction: 0.8, 
      frictionAir: 0.005, 
      restitution: 0.05,
      collisionFilter: { group },
      render: {
        fillStyle: isEnd ? 'rgba(251,191,36,0.65)' : 'rgba(251,191,36,0.3)',
        strokeStyle: 'rgba(251,191,36,0.9)',
        lineWidth: isEnd ? 2 : 1.5,
      },
      label: isEnd ? 'rope-end' : 'rope-segment',
    })
    bodies.push(seg)
  }

  
  for (let i = 0; i < segments - 1; i++) {
    constraints.push(Constraint.create({
      bodyA: bodies[i],     pointA: { x: 0, y: 0 },
      bodyB: bodies[i + 1], pointB: { x: 0, y: 0 },
      stiffness: 0.98,      damping: 0.01,
      length: segLen,
      render: { strokeStyle: 'rgba(251,191,36,0.55)', lineWidth: 2 },
    }))
  }

  World.add(engine.world, [...bodies, ...constraints])
  return { bodies, constraints }
}


export function spawnSpring(engine, x, y) {
  if (!engine) return null

  const handleA = Bodies.circle(x, y, 8, {
    friction: 0.1, frictionAir: 0.01,
    render: {
      fillStyle: 'rgba(57,255,20,0.65)',
      strokeStyle: 'rgba(57,255,20,0.9)',
      lineWidth: 2,
    },
    label: 'spring-end',
  })

  const handleB = Bodies.circle(x, y + 100, 8, {
    friction: 0.1, frictionAir: 0.01,
    render: {
      fillStyle: 'rgba(57,255,20,0.65)',
      strokeStyle: 'rgba(57,255,20,0.9)',
      lineWidth: 2,
    },
    label: 'spring-end',
  })

  const spring = Constraint.create({
    bodyA: handleA, pointA: { x: 0, y: 0 },
    bodyB: handleB, pointB: { x: 0, y: 0 },
    stiffness: 0.03,
    damping: 0.02,
    length: 100,
    render: {
      visible: true,
      strokeStyle: 'rgba(57,255,20,0.7)',
      lineWidth: 3.5,
      type: 'spring',
    },
  })

  World.add(engine.world, [handleA, handleB, spring])
  return { handleA, handleB, spring }
}


export function clearBodies(engine) {
  if (!engine) return
  const toRemove = Composite.allBodies(engine.world).filter(
    b => b.label !== 'boundary' && b.label !== 'floor'
  )
  
  toRemove.forEach(b => {
    if (b._motorHandler && b._motorEngine) {
      Events.off(b._motorEngine, 'beforeUpdate', b._motorHandler)
    }
  })
  const constraintsToRemove = Composite.allConstraints(engine.world).filter(
    c => c.label !== 'Mouse Constraint'
  )
  World.remove(engine.world, toRemove)
  World.remove(engine.world, constraintsToRemove)
}




export function spawnPivot(engine, x, y) {
  if (!engine) return null

  const orange = 'rgba(255,120,60,'
  const anchorBody = Bodies.circle(x, y, 10, {
    isStatic: true, label: 'pivot-anchor',
    render: {
      fillStyle:   `${orange}0.5)`,
      strokeStyle: `${orange}0.9)`,
      lineWidth: 2,
    },
  })

  const arm = Bodies.rectangle(x, y + 60, 18, 100, {
    frictionAir: 0.005, restitution: 0.2,
    label: 'pivot-arm',
    render: {
      fillStyle:   `${orange}0.15)`,
      strokeStyle: `${orange}0.8)`,
      lineWidth: 1.5,
    },
  })

  const pivot = Constraint.create({
    bodyA: anchorBody, pointA: { x: 0, y: 0 },
    bodyB: arm,        pointB: { x: 0, y: -50 },
    stiffness: 1,
    length: 0,
    render: {
      visible: true,
      strokeStyle: `${orange}0.6)`,
      lineWidth: 2,
    },
  })

  
  Body.setAngularVelocity(arm, 0.08)

  World.add(engine.world, [anchorBody, arm, pivot])
  return { anchorBody, arm, pivot }
}





export function spawnMotor(engine, x, y, options = {}) {
  if (!engine) return null

  const gold = 'rgba(255,200,0,'
  const speed = options.speed ?? 0.04   

  const hub = Bodies.circle(x, y, 14, {
    isStatic: true, label: 'motor-hub',
    render: {
      fillStyle:   `${gold}0.5)`,
      strokeStyle: `${gold}0.9)`,
      lineWidth: 2,
    },
  })

  const disc = Bodies.circle(x, y, 46, {
    frictionAir: 0.0, restitution: 0.1,
    label: 'motor-disc',
    render: {
      fillStyle:   `${gold}0.10)`,
      strokeStyle: `${gold}0.8)`,
      lineWidth: 2,
    },
  })

  
  const spoke = Bodies.rectangle(x, y, 8, 80, {
    isStatic: false, label: 'motor-spoke',
    collisionFilter: { mask: 0 }, 
    render: {
      fillStyle:   `${gold}0.4)`,
      strokeStyle: `${gold}0.7)`,
      lineWidth: 1,
    },
  })

  
  const discConstraint = Constraint.create({
    bodyA: hub,  pointA: { x: 0, y: 0 },
    bodyB: disc, pointB: { x: 0, y: 0 },
    stiffness: 1, length: 0,
    render: { visible: false },
  })
  const spokeConstraint = Constraint.create({
    bodyA: hub,   pointA: { x: 0, y: 0 },
    bodyB: spoke, pointB: { x: 0, y: 0 },
    stiffness: 1, length: 0,
    render: { visible: false },
  })

  
  const motorHandler = () => {
    Body.setAngularVelocity(disc,  speed)
    Body.setAngularVelocity(spoke, speed)
  }
  Events.on(engine, 'beforeUpdate', motorHandler)

  
  disc._motorHandler = motorHandler
  disc._motorEngine  = engine

  World.add(engine.world, [hub, disc, spoke, discConstraint, spokeConstraint])
  return { hub, disc, spoke }
}




export function spawnPulley(engine, x, y) {
  if (!engine) return null

  
  const axis = Bodies.circle(x, y, 8, {
    isStatic: true,
    label: 'pulley-axis',
    render: {
      fillStyle: 'rgba(255, 255, 255, 0.95)',
      strokeStyle: 'rgba(0, 245, 255, 0.8)',
      lineWidth: 2,
    }
  })

  
  const wheel = Bodies.circle(x, y, 36, {
    friction: 0.8,
    restitution: 0.1,
    density: 0.005,
    label: 'pulley-wheel',
    render: {
      fillStyle: 'rgba(15, 23, 42, 0.8)', 
      strokeStyle: 'rgba(0, 245, 255, 0.75)', 
      lineWidth: 5, 
    }
  })

  
  const spokes = Bodies.rectangle(x, y, 6, 60, {
    isStatic: false,
    label: 'pulley-spokes',
    collisionFilter: { mask: 0 }, 
    render: {
      fillStyle: 'rgba(0, 245, 255, 0.45)',
      strokeStyle: 'rgba(0, 245, 255, 0.2)',
      lineWidth: 1,
    }
  })

  
  const wheelConstraint = Constraint.create({
    bodyA: axis, pointA: { x: 0, y: 0 },
    bodyB: wheel, pointB: { x: 0, y: 0 },
    stiffness: 1.0, length: 0,
    render: { visible: false }
  })
  
  const spokesConstraint = Constraint.create({
    bodyA: axis, pointA: { x: 0, y: 0 },
    bodyB: spokes, pointB: { x: 0, y: 0 },
    stiffness: 1.0, length: 0,
    render: { visible: false }
  })

  World.add(engine.world, [axis, wheel, spokes, wheelConstraint, spokesConstraint])
  return { axis, wheel, spokes }
}
