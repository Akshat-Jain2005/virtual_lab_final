
const AnalyticsFrame = require('../../models/AnalyticsFrame');

exports.getRoomAnalytics = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { start, end, limit = 100 } = req.query;
    
    const query = { roomId };
    if (start || end) {
      query.timestamp = {};
      if (start) query.timestamp.$gte = new Date(start);
      if (end) query.timestamp.$lte = new Date(end);
    }

    const frames = await AnalyticsFrame.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
      
    res.json(frames);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const summary = await AnalyticsFrame.aggregate([
      { $match: { roomId } },
      { $group: {
        _id: "$roomId",
        avgKE: { $avg: "$aggregateData.totalKE" },
        maxKE: { $max: "$aggregateData.totalKE" },
        totalFrames: { $sum: 1 }
      }}
    ]);

    res.json(summary[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
