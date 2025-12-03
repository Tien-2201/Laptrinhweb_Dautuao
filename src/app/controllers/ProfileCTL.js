const db = require('../../config/db');

class ProfileCTL {
    showProfile(req, res) {
        const user = req.session.user;
        if (!user) return res.redirect('/login');

        const sqlBalance = `SELECT balance FROM wallets WHERE user_id = ? LIMIT 1`;
        db.query(sqlBalance, [user.id], (errBalance, balanceRows) => {
            if (errBalance) {
                console.error('[ProfileCTL] Error fetching balance:', errBalance);
                return res.render('profile', { layout: 'main', user, holdings: [], balanceUsd: 0 });
            }

            const balanceUsd = balanceRows.length ? Number(balanceRows[0].balance) : 0;

                const sqlHoldings = `
                    SELECT c.coin_id AS coin_key, c.symbol,
                           SUM(CASE WHEN t.type='buy' THEN t.amount ELSE 0 END) -
                           SUM(CASE WHEN t.type='sell' THEN t.amount ELSE 0 END) AS amount
                    FROM transactions t
                    JOIN coins c ON t.coin_id = c.id
                    WHERE t.user_id = ?
                    GROUP BY t.coin_id, c.symbol, c.coin_id
                    HAVING amount > 0
                `;

                db.query(sqlHoldings, [user.id], (errHoldings, rows) => {
                if (errHoldings) {
                    console.error('[ProfileCTL] Error fetching holdings:', errHoldings);
                    return res.render('profile', { layout: 'main', user, holdings: [], balanceUsd });
                }

                    const holdings = rows.map(r => ({
                        coin: r.coin_key,
                        symbol: r.symbol,
                        amount: Number(r.amount)
                    }));

                // 3. Render profile với holdings và balance
                res.render('profile', { layout: 'main', user, holdings, balanceUsd });
            });
        });
    }
}

module.exports = new ProfileCTL();
