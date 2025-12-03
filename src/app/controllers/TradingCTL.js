
const db = require('../../config/db');

class TradingCTL {

    trading(req, res) {
        // Lấy danh sách coin active để render select server-side (giúp initial render có đầy đủ coin)
        db.query('SELECT coin_id, symbol, name, is_active FROM coins WHERE is_active = 1 ORDER BY display_order ASC', (err, rows) => {
            if (err) {
                console.error('[TradingCTL] Error fetching coins:', err);
                return res.render('trading', { coins: [] });
            }
            res.render('trading', { coins: rows || [] });
        });
    }
};

module.exports = new TradingCTL();