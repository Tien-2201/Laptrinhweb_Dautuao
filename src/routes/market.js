
const express = require('express');
const router = express.Router();

const marketCTL = require('../app/controllers/MarketCTL.js');
const auth = require('../middleware/auth');
const marketService = require('../services/marketService');
const db = require('../config/db');

router.get('/', auth.ensureAuth, marketCTL.market);

// API trả dữ liệu giá cho client
router.get('/data', (req, res) => {
	const cache = marketService.getData();
	const now = Date.now();
	const updatedAt = cache && cache.updatedAt ? cache.updatedAt : 0;
	const data = cache && cache.data ? cache.data : [];
	// consider stale if older than minInterval (fallback 5min)
	const minInterval = typeof marketService.minInterval === 'number' ? marketService.minInterval : (60 * 1000);
	const isStale = !updatedAt || (now - updatedAt) > minInterval;
	res.json({ data, updatedAt, isStale, backoffMs: marketService.backoffMs || 0 });
});

// API trả danh sách coin (active)
router.get('/coins', (req, res) => {
	db.query('SELECT coin_id, symbol, name, is_active FROM coins WHERE is_active = 1 ORDER BY display_order ASC', (err, rows) => {
		if (err) {
			console.error('[market] coins query error:', err);
			return res.status(500).json({ error: 'Database error' });
		}
		res.json({ coins: rows || [] });
	});
});

module.exports = router;