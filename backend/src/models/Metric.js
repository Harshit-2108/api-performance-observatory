const mongoose = require('mongoose');

const MetricSchema = new mongoose.Schema(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Monitor',
      required: true,
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    responseTime: {
      type: Number,
      required: true // milliseconds
    },
    status: {
      type: Number,
      required: true // HTTP status code (e.g. 200, 500, or 0/null for timeout/connection error)
    },
    isUp: {
      type: Boolean,
      required: true
    },
    regionalLatency: {
      us: { type: Number },
      eu: { type: Number },
      in: { type: Number },
      as: { type: Number }
    }
  },
  {
    // No automatic timestamps, as we rely on explicit 'timestamp'
    timestamps: false
  }
);

// Compound index for efficient range queries per monitor
MetricSchema.index({ monitorId: 1, timestamp: -1 });

module.exports = mongoose.model('Metric', MetricSchema);
