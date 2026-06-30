const express = require('express');
const router = express.Router();
const DeploymentEvent = require('../models/DeploymentEvent');

// Save deployment event directly to MongoDB
const saveDeploymentEvent = async (eventData) => {
  const event = new DeploymentEvent(eventData);
  return await event.save();
};

// @desc    Receive GitHub webhook event
// @route   POST /api/webhooks/github
// @access  Public (webhook verified or parsed generally)
router.post('/github', async (req, res, next) => {
  try {
    const gitEvent = req.headers['x-github-event'];
    const payload = req.body;

    if (!payload) {
      return res.status(400).json({ success: false, message: 'Empty payload body' });
    }

    let type = 'COMMIT';
    let title = '';
    let description = '';
    let sha = '';
    let author = '';
    let url = '';
    let environment = '';
    const repository = payload.repository?.name || '';

    if (gitEvent === 'push') {
      type = 'COMMIT';
      const headCommit = payload.head_commit;
      if (headCommit) {
        sha = headCommit.id?.substring(0, 7) || '';
        title = `Commit by ${headCommit.author?.username || 'developer'}: ${headCommit.message?.split('\n')[0] || ''}`;
        description = headCommit.message || '';
        author = headCommit.author?.name || '';
        url = headCommit.url || '';
      } else {
        title = `Push Event in repository ${repository}`;
      }
    } else if (gitEvent === 'deployment' || gitEvent === 'deployment_status') {
      type = 'DEPLOYMENT';
      const deploy = payload.deployment;
      environment = deploy?.environment || 'production';
      sha = deploy?.sha?.substring(0, 7) || '';
      title = `Deploy to ${environment} (${sha})`;
      description = deploy?.description || `Deployment process triggered on environment ${environment}.`;
      author = payload.sender?.login || 'sre-agent';
      url = payload.deployment_status?.target_url || '';
    } else if (gitEvent === 'release') {
      type = 'RELEASE';
      const rel = payload.release;
      title = `Release ${rel?.tag_name || 'v1.0.0-stable'}`;
      description = rel?.body || rel?.name || '';
      sha = '';
      author = rel?.author?.login || 'release-bot';
      url = rel?.html_url || '';
    } else {
      // General ping or unsupported event
      return res.status(200).json({ success: true, message: `Ignored unhandled GitHub event: ${gitEvent}` });
    }

    const savedEvent = await saveDeploymentEvent({
      type,
      title,
      description,
      sha,
      environment,
      author,
      url,
      repository,
      timestamp: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'GitHub webhook processed successfully',
      data: savedEvent
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Simulate receiving a GitHub event (for local testing / demonstration)
// @route   POST /api/webhooks/github/simulate
// @access  Public
router.post('/github/simulate', async (req, res, next) => {
  try {
    const { type, title, description, repository, environment, sha, author } = req.body;

    if (!type || !title || !repository) {
      return res.status(400).json({
        success: false,
        message: 'Missing required simulation inputs: type, title, repository'
      });
    }

    const savedEvent = await saveDeploymentEvent({
      type,
      title,
      description: description || 'Simulated event logged via testing dashboard.',
      sha: sha || Math.random().toString(16).substring(2, 9),
      environment: environment || (type === 'DEPLOYMENT' ? 'production' : ''),
      author: author || 'observatory-simulator',
      url: `https://github.com/observatory/${repository}`,
      repository,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Simulated GitHub event logged successfully',
      data: savedEvent
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
