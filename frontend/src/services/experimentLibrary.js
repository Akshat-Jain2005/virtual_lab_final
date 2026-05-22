/**
 * experimentLibrary.js
 *
 * Serialises / deserialises the live Matter.js world state so experiments
 * can be saved to the backend and reloaded later.
 *
 * World state schema (JSON-serialisable):
 * {
 *   version: 1,
 *   savedAt: ISO8601,
 *   gravity: { x, y },
 *   bodies: [{ id, label, type, x, y, angle, vx, vy, w, h, radius,
 *              isStatic, mass, friction, frictionAir, restitution,
 *              fillStyle, strokeStyle }],
 *   constraints: [{ type, stiffness, length, damping,
 *                   bodyAId|null, pointAx, pointAy,
 *                   bodyBId|null, pointBx, pointBy }]
 * }
 */

import api from './api'
import { clearBodies } from '../components/canvas/PhysicsCanvas'
import { spawnNewtonCradle, spawnPendulum, spawnInclinedPlane, spawnProjectileMotion } from '../components/canvas/templates'

const SCHEMA_VERSION = 1

// ── Serialise ─────────────────────────────────────────────────────────────────

export function serializeWorld(engine) {
  if (!engine?.world) throw new Error('Engine not ready')
  const Matter = window.Matter
  if (!Matter) throw new Error('Matter.js not loaded')

  const { Composite } = Matter

  const bodies = Composite.allBodies(engine.world)
    .filter(b => b.label !== 'boundary' && b.label !== 'floor')
    .map(b => ({
      // identity
      id:          b.id,
      label:       b.label,
      // position
      x:           b.position.x,
      y:           b.position.y,
      angle:       b.angle,
      // velocity
      vx:          b.velocity.x,
      vy:          b.velocity.y,
      // physics
      isStatic:    b.isStatic,
      mass:        b.mass,
      friction:    b.friction,
      frictionAir: b.frictionAir,
      restitution: b.restitution,
      // geometry hints (best-effort)
      _width:    b.bounds ? Math.round(b.bounds.max.x - b.bounds.min.x) : null,
      _height:   b.bounds ? Math.round(b.bounds.max.y - b.bounds.min.y) : null,
      _radius:   b.circleRadius ?? null,
      _sides:    b.vertices?.length ?? null,
      // render
      fillStyle:   b.render?.fillStyle   ?? 'rgba(0,245,255,0.18)',
      strokeStyle: b.render?.strokeStyle ?? 'rgba(0,245,255,0.8)',
    }))

  const constraints = Composite.allConstraints(engine.world)
    .filter(c => c.label !== 'Mouse Constraint')
    .map(c => ({
      stiffness: c.stiffness,
      damping:   c.damping,
      length:    c.length,
      bodyAId:   c.bodyA?.id ?? null,
      pointAx:   c.pointA?.x ?? 0,
      pointAy:   c.pointA?.y ?? 0,
      bodyBId:   c.bodyB?.id ?? null,
      pointBx:   c.pointB?.x ?? 0,
      pointBy:   c.pointB?.y ?? 0,
      render: {
        visible:     c.render?.visible     ?? true,
        strokeStyle: c.render?.strokeStyle ?? 'rgba(0,245,255,0.5)',
        lineWidth:   c.render?.lineWidth   ?? 2,
        type:        c.render?.type        ?? 'line',
      },
    }))

  return {
    version:   SCHEMA_VERSION,
    savedAt:   new Date().toISOString(),
    gravity:   { x: engine.gravity.x, y: engine.gravity.y },
    bodies,
    constraints,
  }
}

// ── Deserialise ───────────────────────────────────────────────────────────────

export function deserializeWorld(engine, snapshot) {
  if (!engine?.world) throw new Error('Engine not ready')
  const Matter = window.Matter
  if (!Matter) throw new Error('Matter.js not loaded')

  const { World, Bodies, Body, Constraint, Composite } = Matter

  // Clear existing (non-wall) bodies
  const toRemove = Composite.allBodies(engine.world).filter(
    b => b.label !== 'boundary' && b.label !== 'floor'
  )
  const cToRemove = Composite.allConstraints(engine.world).filter(
    c => c.label !== 'Mouse Constraint'
  )
  World.remove(engine.world, toRemove)
  World.remove(engine.world, cToRemove)

  // Restore gravity
  if (snapshot.gravity) {
    engine.gravity.x = snapshot.gravity.x
    engine.gravity.y = snapshot.gravity.y
  }

  // Build id → new body map for constraint wiring
  const idMap = {}

  snapshot.bodies?.forEach(bd => {
    const render = { fillStyle: bd.fillStyle, strokeStyle: bd.strokeStyle, lineWidth: 1.5 }
    const common = {
      isStatic:    bd.isStatic,
      friction:    bd.friction,
      frictionAir: bd.frictionAir,
      restitution: bd.restitution,
      label:       bd.label,
      render,
    }

    let body
    const lbl = (bd.label || '').toLowerCase()

    if (bd._radius && (lbl.includes('circle') || lbl.includes('rope') || lbl.includes('motor'))) {
      body = Bodies.circle(bd.x, bd.y, bd._radius, common)
    } else if (bd._sides && lbl.includes('polygon')) {
      body = Bodies.polygon(bd.x, bd.y, bd._sides, bd._radius ?? 36, common)
    } else {
      const w = bd._width  || 80
      const h = bd._height || 60
      body = Bodies.rectangle(bd.x, bd.y, w, h, common)
    }

    Body.setAngle(body, bd.angle)
    Body.setVelocity(body, { x: bd.vx, y: bd.vy })
    if (!bd.isStatic) Body.setMass(body, bd.mass)

    idMap[bd.id] = body
    World.add(engine.world, body)
  })

  // Restore constraints
  snapshot.constraints?.forEach(cd => {
    const bodyA = cd.bodyAId != null ? idMap[cd.bodyAId] : undefined
    const bodyB = cd.bodyBId != null ? idMap[cd.bodyBId] : undefined
    if (!bodyA && !bodyB) return  // skip dangling constraints

    const c = Constraint.create({
      bodyA:    bodyA || undefined,
      pointA:   { x: cd.pointAx, y: cd.pointAy },
      bodyB:    bodyB || undefined,
      pointB:   { x: cd.pointBx, y: cd.pointBy },
      stiffness: cd.stiffness,
      damping:   cd.damping,
      length:    cd.length,
      render:    cd.render,
    })
    World.add(engine.world, c)
  })

  return { bodyCount: Object.keys(idMap).length }
}

// ── API layer ─────────────────────────────────────────────────────────────────

/**
 * saveExperiment — serialises and posts to backend.
 * Returns { id, name, savedAt } on success.
 */
export async function saveExperiment(engine, name, tags = [], isPublic = false, projectId = null) {
  const snapshot = serializeWorld(engine)
  const payload  = { name, tags, isPublic, snapshot, projectId }

  try {
    const res = await api.post('/api/projects', {
      name,
      description: `Saved experiment: ${name}`,
      tags,
      isPublic,
      thumbnail: '🔬',
      snapshot,       // stored in project document
    })
    return { id: res.data._id || res.data.id, name, savedAt: snapshot.savedAt }
  } catch (err) {
    // Offline / no backend — persist to localStorage
    const key = `vlab-experiment-${Date.now()}`
    localStorage.setItem(key, JSON.stringify({ name, tags, isPublic, snapshot }))
    return { id: key, name, savedAt: snapshot.savedAt, offline: true }
  }
}

/**
 * loadExperiment — fetches snapshot from backend and restores world.
 * Returns { bodyCount } on success.
 */
export async function loadExperiment(engine, projectId) {
  // Hardcoded templates for the Experiment Gallery
  const cx = window.innerWidth / 2
  const cy = window.innerHeight * 0.3

  if (projectId === 'proj_001') {
    clearBodies(engine)
    return { bodyCount: spawnPendulum(engine, cx, cy) }
  }
  if (projectId === 'proj_002') {
    clearBodies(engine)
    return { bodyCount: spawnProjectileMotion(engine, cx, cy) }
  }
  if (projectId === 'proj_003') {
    clearBodies(engine)
    return { bodyCount: spawnInclinedPlane(engine, cx, cy) }
  }
  if (projectId === 'proj_004') {
    clearBodies(engine)
    return { bodyCount: spawnNewtonCradle(engine, cx, cy) }
  }
  if (projectId === 'proj_005') {
    clearBodies(engine)
    return { bodyCount: spawnInclinedPlane(engine, cx, cy) }
  }

  try {
    // Try backend first
    const res = await api.get(`/api/projects/${projectId}`)
    const project = res.data
    if (project?.snapshot) {
      return deserializeWorld(engine, project.snapshot)
    }
  } catch {}

  // Try localStorage (offline saves)
  const raw = localStorage.getItem(projectId)
  if (raw) {
    const { snapshot } = JSON.parse(raw)
    return deserializeWorld(engine, snapshot)
  }

  throw new Error(`Cannot load experiment ${projectId}: snapshot not found`)
}

/**
 * listLocalExperiments — returns locally cached experiments.
 */
export function listLocalExperiments() {
  const results = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key.startsWith('vlab-experiment-')) continue
    try {
      const { name, tags, snapshot } = JSON.parse(localStorage.getItem(key))
      results.push({ id: key, name, tags, savedAt: snapshot.savedAt, isLocal: true })
    } catch {}
  }
  return results
}
