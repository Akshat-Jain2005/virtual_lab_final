
const Project = require('../../models/Project');
const PhysicsObject = require('../../models/PhysicsObject');
const Constraint = require('../../models/Constraint');
const logger = require('../../utils/logger');

exports.createProject = async (req, res) => {
  try {
    const project = new Project({
      ...req.body,
      ownerId: req.user.userId
    });
    await project.save();
    res.status(201).json(project);
  } catch (err) {
    logger.error('Project creation error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.saveVersion = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { snapshot, note } = req.body;
    
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const newVersion = project.versions.length + 1;
    project.versions.push({
      version: newVersion,
      snapshot,
      savedBy: req.user.userId,
      note
    });
    
    project.currentVersion = newVersion;
    await project.save();

    res.json({ message: 'Version saved', version: newVersion });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.rollback = async (req, res) => {
  try {
    const { projectId, version } = req.params;
    const project = await Project.findById(projectId);
    
    const targetVersion = project.versions.find(v => v.version == version);
    if (!targetVersion) return res.status(404).json({ error: 'Version not found' });

    project.currentVersion = version;
    
    
    
    await project.save();
    res.json({ message: `Rolled back to version ${version}`, snapshot: targetVersion.snapshot });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ ownerId: req.user.userId, isDeleted: false });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project || project.isDeleted) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.simulateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { steps = 120, dt = 16.667 } = req.body; 

    
    let snapshot = req.body.snapshot || null;
    if (!snapshot && projectId && projectId !== 'local') {
      try {
        const project = await Project.findById(projectId);
        if (project) {
          snapshot = project.snapshot ||
            (project.versions?.length
              ? project.versions[project.versions.length - 1].snapshot
              : null);
        }
      } catch (_castErr) {
        
      }
    }

    if (!snapshot || !Array.isArray(snapshot.bodies)) {
      return res.status(422).json({ error: 'No valid snapshot found for simulation' });
    }

    
    const Matter = require('matter-js');
    const { Engine, Bodies, Body, Constraint, World } = Matter;

    const engine = Engine.create();

    
    if (snapshot.gravity) {
      engine.gravity.x = snapshot.gravity.x;
      engine.gravity.y = snapshot.gravity.y;
    }

    const idMap = {};

    (snapshot.bodies || []).forEach(bd => {
      let body;
      const lbl = (bd.label || '').toLowerCase();
      const common = {
        isStatic: bd.isStatic,
        friction: bd.friction,
        frictionAir: bd.frictionAir,
        restitution: bd.restitution,
        label: bd.label,
      };

      if (bd._radius && (lbl.includes('circle') || lbl.includes('rope') || lbl.includes('motor'))) {
        body = Bodies.circle(bd.x, bd.y, bd._radius, common);
      } else if (bd._sides && lbl.includes('polygon')) {
        body = Bodies.polygon(bd.x, bd.y, bd._sides, bd._radius ?? 36, common);
      } else {
        body = Bodies.rectangle(bd.x, bd.y, bd._width || 80, bd._height || 60, common);
      }

      Body.setAngle(body, bd.angle);
      Body.setVelocity(body, { x: bd.vx || 0, y: bd.vy || 0 });
      if (!bd.isStatic) Body.setMass(body, bd.mass);

      idMap[bd.id] = body;
      World.add(engine.world, body);
    });

    (snapshot.constraints || []).forEach(cd => {
      const bodyA = cd.bodyAId != null ? idMap[cd.bodyAId] : undefined;
      const bodyB = cd.bodyBId != null ? idMap[cd.bodyBId] : undefined;
      if (!bodyA && !bodyB) return;
      const c = Constraint.create({
        bodyA: bodyA || undefined,
        pointA: { x: cd.pointAx, y: cd.pointAy },
        bodyB: bodyB || undefined,
        pointB: { x: cd.pointBx, y: cd.pointBy },
        stiffness: cd.stiffness,
        damping: cd.damping,
        length: cd.length,
      });
      World.add(engine.world, c);
    });

    const CANVAS_HEIGHT = 600; 
    const frames = [];
    const clampedSteps = Math.min(Math.max(steps, 10), 600); 

    for (let i = 0; i < clampedSteps; i++) {
      Engine.update(engine, dt);

      let totalKE = 0;
      let totalPE = 0;
      let sumVx = 0;
      let sumVy = 0;
      let count = 0;

      const allBodies = Matter.Composite.allBodies(engine.world);
      allBodies.forEach(b => {
        if (b.isStatic) return;
        const mass = b.mass || 1;
        const vx = b.velocity.x;
        const vy = b.velocity.y;
        const posY = b.position.y;
        const magnitude = Math.sqrt(vx * vx + vy * vy);
        const h = Math.max(0, CANVAS_HEIGHT - posY);
        totalKE += 0.5 * mass * (magnitude * magnitude) * 500;
        totalPE += mass * 9.81 * h * 0.5;
        sumVx += vx;
        sumVy += vy;
        count++;
      });

      const n = count || 1;
      frames.push({
        t: i,
        kineticEnergy: Math.round(totalKE),
        potentialEnergy: Math.round(totalPE),
        totalEnergy: Math.round(totalKE + totalPE),
        velocityX: Number((sumVx / n).toFixed(3)),
        velocityY: Number((sumVy / n).toFixed(3)),
      });
    }

    res.json({ frames });
  } catch (err) {
    logger.error('Simulation error:', err);
    res.status(500).json({ error: 'Simulation failed', detail: err.message });
  }
};
