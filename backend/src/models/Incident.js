const mongoose = require('mongoose');

const TimelineEventSchema = new mongoose.Schema({
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED', 'COMMENT'],
    default: 'TRIGGERED'
  }
});

const IncidentSchema = new mongoose.Schema(
  {
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Monitor',
      required: true
    },
    status: {
      type: String,
      enum: ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'],
      default: 'OPEN'
    },
    type: {
      type: String,
      enum: ['DOWN', 'SLOW'],
      default: 'DOWN'
    },
    message: {
      type: String,
      required: [true, 'Please add details for this incident']
    },
    downtimeStart: {
      type: Date,
      default: Date.now
    },
    downtimeEnd: {
      type: Date
    },
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedAt: {
      type: Date
    },
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolutionNotes: {
      type: String,
      default: ''
    },
    rootCause: {
      type: String,
      default: ''
    },
    timeline: {
      type: [TimelineEventSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Incident', IncidentSchema);
