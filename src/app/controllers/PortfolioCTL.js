const db = require('../../config/db');
const marketService = require('../../services/marketService.js');

class PortfolioCTL {
  async portfolio(req, res) {
    const user = req.session.user;
    if (!user) return res.redirect('/login');

    const fmt = (n) => (n == null || isNaN(n)) ? null : Number(n).toFixed(2);

    try {
      // LẤY SỐ DƯ TỪ DATABASE
      db.query('SELECT balance FROM wallets WHERE user_id = ?', [user.id], (errWallet, walletRows) => {
        if (errWallet) {
          console.error('[PortfolioCTL] Error reading wallet:', errWallet);
          return res.render('portfolio', { 
            balanceUsd: fmt(0), 
            balancePercentage: fmt(100),
            holdings: [], 
            totals: { 
              totalValue: fmt(0), 
              pnl: fmt(0), 
              pnlPercentage: fmt(0),
              isPnlPositive: false, 
              isPnlNegative: false 
            } 
          });
        }

        const balanceUsd = walletRows[0]?.balance ? Number(walletRows[0].balance) : 0;

        // Query transactions và join với coins để có coin_id (string) và symbol
        const sql = `SELECT t.id, t.coin_id AS coin_db_id, c.coin_id AS coin_key, c.symbol, t.type, t.amount, t.price
                     FROM transactions t
                     JOIN coins c ON t.coin_id = c.id
                     WHERE t.user_id = ?
                     ORDER BY t.id ASC`;

        db.query(sql, [user.id], async (err, rows) => {
          if (err) {
            console.error('[PortfolioCTL] Error reading transactions:', err);
            return res.render('portfolio', { 
              balanceUsd: fmt(balanceUsd), 
              balancePercentage: fmt(100),
              holdings: [], 
              totals: { 
                totalValue: fmt(balanceUsd), 
                pnl: fmt(0), 
                pnlPercentage: fmt(0),
                isPnlPositive: false, 
                isPnlNegative: false 
              } 
            });
          }

        // Process transactions (FIFO)
        const openBuys = new Map();

        rows.forEach(r => {
          const coin = (r.coin_key || (r.symbol || '')).toString().toLowerCase();
          const type = (r.type || 'buy').toLowerCase();
          const amt = Number(r.amount) || 0;
          const price = Number(r.price) || 0;
          const symbolFromRow = r.symbol ? String(r.symbol).toUpperCase() : null;

          if (!openBuys.has(coin)) openBuys.set(coin, []);

          if (type === 'buy') {
            // store symbol on the buy object so we can show it later without referencing outer-scope r
            openBuys.get(coin).push({ id: r.id, amount: amt, price: price, symbol: symbolFromRow });
          } else if (type === 'sell') {
            let remainingSell = amt;
            const buys = openBuys.get(coin) || [];
            for (let i = 0; i < buys.length && remainingSell > 0; i++) {
              const buy = buys[i];
              if (buy.amount > 0) {
                const reduce = Math.min(buy.amount, remainingSell);
                buy.amount -= reduce;
                remainingSell -= reduce;
              }
            }
            openBuys.set(coin, buys.filter(b => b.amount > 0));
          }
        });

        // Get current prices
        let prices = {};
        let coinNames = {};
        try {
          const cache = marketService.getData();
          const data = (cache && cache.data) ? cache.data : [];
          data.forEach(d => { 
            if (d && d.id) {
              prices[d.id] = d.price;
              coinNames[d.id] = d.name || d.id;
            }
            if (d && d.symbol) {
              const symbolLower = d.symbol.toLowerCase();
              prices[symbolLower] = d.price;
              coinNames[symbolLower] = d.name || symbolLower;
            }
          });
        } catch (e) { 
          console.error('[PortfolioCTL] Market service error:', e); 
        }

        const holdings = [];
        let totalMarketValue = 0;
        let totalCost = 0;

        for (const [coin, buys] of openBuys.entries()) {
          buys.forEach(buy => {
            if (buy.amount <= 0) return;
            const currentPrice = (prices[coin] != null) ? Number(prices[coin]) : null;
            const marketValue = currentPrice != null ? buy.amount * currentPrice : null;
            const pnl = (marketValue != null) ? (marketValue - (buy.price * buy.amount)) : null;

            if (marketValue != null) totalMarketValue += marketValue;
            totalCost += buy.price * buy.amount;

            const displaySymbol = buy.symbol || (coin || '').toUpperCase();
            holdings.push({
              coin: coinNames[coin] || displaySymbol,
              symbol: displaySymbol,
              qty: fmt(buy.amount),
              buyPrice: fmt(buy.price),
              currentPrice: currentPrice != null ? fmt(currentPrice) : null,
              marketValue: marketValue != null ? fmt(marketValue) : null,
              pnl: pnl != null ? fmt(pnl) : null,
              isPnlPositive: pnl > 0,
              isPnlNegative: pnl < 0
            });
          });
        }

        const totalPnl = totalMarketValue - totalCost;
        const totalValue = Number(balanceUsd) + totalMarketValue;
        const pnlPercentage = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
        const balancePercentage = totalValue > 0 ? (balanceUsd / totalValue) * 100 : 100;

        const totals = {
          totalValue: fmt(totalValue),
          pnl: fmt(totalPnl),
          pnlPercentage: fmt(pnlPercentage),
          isPnlPositive: totalPnl > 0,
          isPnlNegative: totalPnl < 0
        };



        return res.render('portfolio', { 
          balanceUsd: fmt(balanceUsd), 
          balancePercentage: fmt(balancePercentage),
          holdings, 
          totals 
        });
      });
    });
    } catch (e) {
      console.error('[PortfolioCTL] Unexpected error:', e);
      
      // Lấy balance từ DB trong catch block
      db.query('SELECT balance FROM wallets WHERE user_id = ?', [user.id], (errWallet, walletRows) => {
        const balanceUsd = walletRows && walletRows[0] ? Number(walletRows[0].balance) : 0;
        
        return res.render('portfolio', { 
          balanceUsd: fmt(balanceUsd), 
          balancePercentage: fmt(100),
          holdings: [], 
          totals: { 
            totalValue: fmt(balanceUsd), 
            pnl: fmt(0), 
            pnlPercentage: fmt(0),
            isPnlPositive: false, 
            isPnlNegative: false 
          } 
        });
      });
    }
  }
}

module.exports = new PortfolioCTL();