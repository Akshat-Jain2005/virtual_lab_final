import Matter from 'matter-js'

const { Bodies, Body, Constraint, World } = Matter

export function spawnNewtonCradle(engine, cx, cy) {
  const n = 5
  const r = 24
  const gap = r * 2 + 2
  const barY = cy - 50
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
      restitution: 0.999, friction: 0, frictionAir: 0.0005,
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
  // Pull first ball back
  Body.setPosition(balls[0], { x: balls[0].position.x - 120, y: balls[0].position.y - 120 })
  World.add(engine.world, [bar, ...balls, ...strings])
  return balls.length + 1
}

export function spawnPendulum(engine, cx, cy) {
  const barY = cy - 50
  const armLen = 220
  const bar = Bodies.rectangle(cx, barY, 100, 12, {
    isStatic: true, label: 'pendulum-bar',
    render: { fillStyle: 'rgba(191,0,255,0.12)', strokeStyle: 'rgba(191,0,255,0.6)', lineWidth: 1.5 },
  })
  const ball = Bodies.circle(cx + 150, barY + armLen - 50, 32, {
    restitution: 0.92, friction: 0, frictionAir: 0.002,
    label: 'circle',
    render: { fillStyle: 'rgba(191,0,255,0.2)', strokeStyle: 'rgba(191,0,255,0.85)', lineWidth: 2 },
  })
  const string = Constraint.create({
    bodyA: bar, pointA: { x: 0, y: 6 },
    bodyB: ball, pointB: { x: 0, y: -32 },
    stiffness: 0.9, length: armLen,
    render: { strokeStyle: 'rgba(191,0,255,0.5)', lineWidth: 1.5 },
  })
  World.add(engine.world, [bar, ball, string])
  return 2
}

export function spawnInclinedPlane(engine, cx, cy) {
  const w = 400
  const h = 20
  const angle = Math.PI / 6 // 30 degrees
  const plane = Bodies.rectangle(cx, cy + 100, w, h, {
    isStatic: true, label: 'inclined-plane',
    angle: angle,
    friction: 0.05,
    render: { fillStyle: 'rgba(57,255,20,0.12)', strokeStyle: 'rgba(57,255,20,0.6)', lineWidth: 1.5 },
  })
  
  // Calculate start position for circle
  const startX = cx - (w / 2 - 50) * Math.cos(angle)
  const startY = cy + 100 - (w / 2 - 50) * Math.sin(angle) - 30
  
  const rollingCircle = Bodies.circle(startX, startY - 20, 25, {
    restitution: 0.9, friction: 0.05,
    label: 'circle',
    render: { fillStyle: 'rgba(191,0,255,0.2)', strokeStyle: 'rgba(191,0,255,0.85)', lineWidth: 2 },
  })
  
  // Block below the ramp to collide with
  const targetBlock = Bodies.rectangle(cx + 300, window.innerHeight - 60, 80, 60, {
    restitution: 0.9, friction: 0.1,
    label: 'rectangle',
    render: { fillStyle: 'rgba(255,105,180,0.2)', strokeStyle: 'rgba(255,105,180,0.85)', lineWidth: 2 },
  })
  
  World.add(engine.world, [plane, rollingCircle, targetBlock])
  return 3
}

export function spawnProjectileMotion(engine, cx, cy) {
  const ground = Bodies.rectangle(cx, cy + 200, 800, 20, {
    isStatic: true, label: 'ground', friction: 0.8,
    render: { fillStyle: 'rgba(255,120,60,0.12)', strokeStyle: 'rgba(255,120,60,0.6)', lineWidth: 1.5 },
  })
  
  const projectile = Bodies.circle(cx - 300, cy + 170, 20, {
    restitution: 0.6, friction: 0.2, frictionAir: 0.005,
    label: 'circle',
    render: { fillStyle: 'rgba(255,120,60,0.2)', strokeStyle: 'rgba(255,120,60,0.85)', lineWidth: 2 },
  })
  
  // Give it an initial velocity (projectile motion)
  Body.setVelocity(projectile, { x: 15, y: -18 })
  
  World.add(engine.world, [ground, projectile])
  return 2
}
