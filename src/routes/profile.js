
const express = require('express');
const router = express.Router();

const profileCTL = require('../app/controllers/ProfileCTL.js');
const auth = require('../middleware/auth');

router.get('/', auth.ensureAuth, profileCTL.showProfile);

module.exports = router;
