/**
 * api/controllers/projectController.js - Project Management and Versioning
 */

const Project = require('../../models/Project');
const PhysicsObject = require('../../models/PhysicsObject');
const Constraint = require('../../models/Constraint');
const logger = require('../../utils/logger');

/**
 * Create a new project
 */
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

/**
 * Save project version
 */
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

/**
 * Rollback project to a specific version
 */
exports.rollback = async (req, res) => {
  try {
    const { projectId, version } = req.params;
    const project = await Project.findById(projectId);
    
    const targetVersion = project.versions.find(v => v.version == version);
    if (!targetVersion) return res.status(404).json({ error: 'Version not found' });

    project.currentVersion = version;
    // In a real implementation, we would also restore the PhysicsObject and Constraint states
    // from the targetVersion.snapshot
    
    await project.save();
    res.json({ message: `Rolled back to version ${version}`, snapshot: targetVersion.snapshot });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * Get all projects for current user
 */
exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ ownerId: req.user.userId, isDeleted: false });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
