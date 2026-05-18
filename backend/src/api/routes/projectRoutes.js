const express = require('express');
const projectController = require('../controllers/projectController');
const { httpAuthMiddleware } = require('../middlewares');

const router = express.Router();

router.use(httpAuthMiddleware);

router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.post('/:projectId/versions', projectController.saveVersion);
router.post('/:projectId/rollback/:version', projectController.rollback);

module.exports = router;
