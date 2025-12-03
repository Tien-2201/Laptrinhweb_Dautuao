
const db = require('../../config/db');

class HistoryCTL {

    history(req, res) {
        const user = req.session.user;
        if (!user) return res.redirect('/login');

        // --- 1. Lấy số dư USD ---
        const sqlBalance = `SELECT balance FROM wallets WHERE user_id = ?`;

        // --- 2. Lấy tài sản đang nắm giữ ---
        const sqlHoldings = `
            SELECT c.coin_id AS coin_key, c.symbol,
                SUM(CASE WHEN t.type='buy' THEN t.amount ELSE -t.amount END) AS total_amount,
                SUM(CASE WHEN t.type='buy' THEN t.amount * t.price ELSE 0 END) AS total_buy_value
            FROM transactions t
            JOIN coins c ON t.coin_id = c.id
            WHERE t.user_id = ?
            GROUP BY t.coin_id, c.symbol, c.coin_id
            HAVING total_amount > 0
        `;

        // --- 3. Lấy toàn bộ lịch sử giao dịch ---
        const sqlHistory = `
            SELECT t.id, c.coin_id AS coin_key, c.symbol, t.type, t.amount, t.price, t.created_at
            FROM transactions t
            JOIN coins c ON t.coin_id = c.id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
        `;

        db.query(sqlBalance, [user.id], (err, balRows) => {
            if (err) {
                console.error("[HistoryCTL] Balance error:", err);
                return res.render("history", { balance: 0, holdings: [], transactions: [] });
            }

            const balance = Number(balRows[0]?.balance || 0).toFixed(2);

            db.query(sqlHoldings, [user.id], (err, holdRows) => {
                if (err) {
                    console.error("[HistoryCTL] Holdings error:", err);
                    return res.render("history", { balance, holdings: [], transactions: [] });
                }

                const holdings = holdRows.map(h => ({
                    coin: h.coin_key,
                    symbol: h.symbol.toUpperCase(),
                    amount: Number(h.total_amount).toFixed(6),
                    avg_price: (h.total_buy_value / h.total_amount).toFixed(2)
                }));

                db.query(sqlHistory, [user.id], (err, txRows) => {
                    if (err) {
                        console.error("[HistoryCTL] Transaction error:", err);
                        return res.render("history", { balance, holdings, transactions: [] });
                    }

                    const transactions = txRows.map(t => {
                        const dateObj = new Date(t.created_at);
                        return {
                            id: t.id,
                            coin: t.coin_key,
                            type: t.type,
                            symbol: t.symbol.toUpperCase(),
                            amount: Number(t.amount).toFixed(6),
                            price: Number(t.price).toFixed(2),
                            total: (t.amount * t.price).toFixed(2),
                            datetime: dateObj.toLocaleDateString('vi-VN'),
                            time: dateObj.toLocaleTimeString('vi-VN'),
                            isBuy: t.type === 'buy'
                        };
                    });

                    // Render ra giao diện
                    res.render("history", { balance, holdings, transactions });
                });
            });
        });
    }
}

module.exports = new HistoryCTL();
