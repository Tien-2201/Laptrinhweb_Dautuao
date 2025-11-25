
const express = require('express');
const router = express.Router();

const homeCTL = require('../app/controllers/HomeCTL.js');

// Trang home công khai (không bắt buộc đăng nhập)
router.get('/', homeCTL.home);

module.exports = router;