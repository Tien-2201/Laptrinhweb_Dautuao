
const express = require('express');
const router = express.Router();

const tradingCTL = require('../app/controllers/TradingCTL.js');
const auth = require('../middleware/auth');

router.get('/', auth.ensureAuth, tradingCTL.trading);

module.exports = router;