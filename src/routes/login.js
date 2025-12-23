
const express = require('express');
const router = express.Router();

const loginCTL = require('../app/controllers/LoginCTL.js');

router.get('/', loginCTL.showLogin);
router.post('/', loginCTL.login);
router.post('/register', loginCTL.register);
// Check email availability (AJAX)
router.get('/check-email', loginCTL.checkEmail);
router.get('/logout', loginCTL.logout);

module.exports = router;