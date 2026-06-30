const mongoose = require('mongoose');

const DeploymentEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['COMMIT', 'DEPLOYMENT', 'RELEASE'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  sha: {
    type: String,
    default: ''
  },
  environment: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: ''
  },
  url: {
    type: String,
    default: ''
  },
  repository: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DeploymentEvent', DeploymentEventSchema);
