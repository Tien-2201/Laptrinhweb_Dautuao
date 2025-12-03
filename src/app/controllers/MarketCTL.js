
const db = require('../../config/db');

class MarketCTL {

    market(req, res) {
        const mobile = /mobile/i.test(req.headers['user-agent']);
        const limit = mobile ? 4 : 50; // Hiển thị 4 coin trên mobile, 50 trên desktop
        let page = parseInt(req.query.page, 10);
        if (!Number.isInteger(page) || page < 1) page = 1;
        const offset = (page - 1) * limit;

        // Lấy tổng số coin trước
        db.query('SELECT COUNT(*) as total FROM coins WHERE is_active = 1', (err, countResult) => {
            if (err) {
                console.error('[MarketCTL] Error fetching count:', err);
                return res.render('market', { coins: [], pagination: {} });
            }
            const total = countResult[0].total;
            const totalPages = Math.max(1, Math.ceil(total / limit));

            // Lấy danh sách coin phân trang
            db.query('SELECT coin_id, symbol, name, is_active FROM coins WHERE is_active = 1 ORDER BY display_order ASC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
                if (err) {
                    console.error('[MarketCTL] Error fetching coins:', err);
                    return res.render('market', { coins: [], pagination: {} });
                }
                const pagination = {
                    currentPage: page,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                    nextPage: page < totalPages ? page + 1 : null,
                    prevPage: page > 1 ? page - 1 : null,
                    limit,
                    mobile
                };
                res.render('market', { coins: rows || [], pagination });
            });
        });
    }
};

module.exports = new MarketCTL();