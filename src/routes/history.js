
const express = require('express');
const router = express.Router();

const historyCTL = require('../app/controllers/HistoryCTL.js');
const auth = require('../middleware/auth');

router.get('/', auth.ensureAuth, historyCTL.history);

module.exports = router;