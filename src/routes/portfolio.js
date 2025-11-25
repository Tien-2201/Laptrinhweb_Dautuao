
const express = require('express');
const router = express.Router();

const portfolioCTL = require('../app/controllers/PortfolioCTL.js');
const auth = require('../middleware/auth');

router.get('/', auth.ensureAuth, portfolioCTL.portfolio);

module.exports = router;