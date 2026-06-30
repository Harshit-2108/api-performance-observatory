const express = require('express');
const { getPublicStatus } = require('../controllers/publicController');

const router = express.Router();

router.get('/status', getPublicStatus);

module.exports = router;
