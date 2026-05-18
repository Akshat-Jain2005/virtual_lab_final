const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { httpAuthMiddleware } = require('../middlewares');

const router = express.Router();

router.use(httpAuthMiddleware);

router.get('/:roomId', analyticsController.getRoomAnalytics);
router.get('/:roomId/summary', analyticsController.getSummary);

module.exports = router;
