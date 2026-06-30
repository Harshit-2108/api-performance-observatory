const mongoose = require('mongoose');

const MonitorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a monitor name'],
      trim: true
    },
    url: {
      type: String,
      required: [true, 'Please add a monitor URL'],
      trim: true
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE'],
      default: 'GET'
    },
    headers: {
      type: Map,
      of: String,
      default: {}
    },
    body: {
      type: String,
      default: ''
    },
    interval: {
      type: Number,
      required: [true, 'Please specify monitoring interval in minutes'],
      default: 5,
      min: [1, 'Interval must be at least 1 minute']
    },
    timeout: {
      type: Number,
      default: 5000, // milliseconds
      min: [500, 'Timeout must be at least 500ms']
    },
    threshold: {
      type: Number,
      default: 3, // consecutive failures before triggering incident
      min: [1, 'Threshold must be at least 1']
    },
    expectedStatus: {
      type: Number,
      default: 200
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    active: {
      type: Boolean,
      default: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['UP', 'DOWN', 'DEGRADED'],
      default: 'UP'
    },
    lastChecked: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Monitor', MonitorSchema);
