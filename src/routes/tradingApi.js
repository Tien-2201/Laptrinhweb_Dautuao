const express = require('express');
const https = require('https');
const marketService = require('../services/marketService');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

const COIN_ID_MAP = { 
  BTC: 'bitcoin', 
  ETH: 'ethereum', 
  BNB: 'binancecoin', 
  SOL: 'solana', 
  XRP: 'ripple' 
};

// GET /api/trading/ohlc?coin=bitcoin&days=1
router.get('/ohlc', (req, res) => {
  const coin = req.query.coin || 'bitcoin';
  const days = req.query.days || '1';
  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coin)}/ohlc?vs_currency=usd&days=${encodeURIComponent(days)}`;

  const options = { headers: { 'User-Agent': 'node.js', 'Accept': 'application/json' } };

  https.get(url, options, (cgRes) => {
    const { statusCode } = cgRes;
    const contentType = cgRes.headers['content-type'] || '';
    const retryAfter = cgRes.headers['retry-after'];
    let raw = '';
    cgRes.on('data', (chunk) => raw += chunk);
    cgRes.on('end', () => {
      if (statusCode === 429) {
        const snippet = raw && raw.slice(0, 300);
        return res.status(502).json({ error: 'Rate limited by CoinGecko', status: 429, retryAfter: retryAfter || null, snippet });
      }

      if (statusCode !== 200) {
        const snippet = raw && raw.slice(0, 300);
        return res.status(502).json({ error: 'Bad response from CoinGecko', status: statusCode, snippet });
      }

      if (!contentType.includes('application/json')) {
        const snippet = raw && raw.slice(0, 300);
        return res.status(502).json({ error: 'Unexpected content-type from CoinGecko', contentType, snippet });
      }

      try {
        const json = JSON.parse(raw);
        const mapped = json.map(item => ({ 
          time: Math.floor(item[0] / 1000), 
          open: item[1], 
          high: item[2], 
          low: item[3], 
          close: item[4] 
        }));
        res.json({ coin, days, data: mapped });
      } catch (e) {
        const snippet = raw && raw.slice(0, 300);
        res.status(502).json({ error: 'Parse error from CoinGecko response', message: String(e), snippet });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'Request failed', message: String(err) });
  });
});

// GET /api/trading/price?coin=bitcoin
router.get('/price', (req, res) => {
  const coin = req.query.coin || 'bitcoin';
  
  // Thử lấy từ cache trước
  try {
    const cache = marketService.getData();
    const data = cache && cache.data ? cache.data : [];
    const found = data.find(d => d.id === coin || (d.symbol && d.symbol.toLowerCase() === coin.toLowerCase()));
    if (found && (found.price != null)) {
      return res.json({ 
        coin, 
        price: found.price, 
        ts: Math.floor(Date.now() / 1000), 
        source: 'cache', 
        updatedAt: cache.updatedAt 
      });
    }
  } catch (e) {
    console.debug('[tradingApi] marketService cache read error', e);
  }

  // Fetch từ CoinGecko
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coin)}&vs_currencies=usd`;
  const options = { headers: { 'User-Agent': 'node.js', 'Accept': 'application/json' } };
  
  https.get(url, options, (cgRes) => {
    const { statusCode } = cgRes;
    const contentType = cgRes.headers['content-type'] || '';
    const retryAfter = cgRes.headers['retry-after'];
    let raw = '';
    cgRes.on('data', chunk => raw += chunk);
    cgRes.on('end', () => {
      if (statusCode === 429) {
        const snippet = raw && raw.slice(0,300);
        return res.status(502).json({ error: 'Rate limited by CoinGecko', status: 429, retryAfter: retryAfter || null, snippet });
      }
      if (statusCode !== 200) {
        const snippet = raw && raw.slice(0,300);
        return res.status(502).json({ error: 'Bad response from CoinGecko', status: statusCode, snippet });
      }
      if (!contentType.includes('application/json')) {
        const snippet = raw && raw.slice(0,300);
        return res.status(502).json({ error: 'Unexpected content-type from CoinGecko', contentType, snippet });
      }
      try {
        const json = JSON.parse(raw);
        const price = json && json[coin] && json[coin].usd;
        if (price == null) {
          return res.status(502).json({ error: 'Price not found in CoinGecko response', snippet: raw && raw.slice(0,300) });
        }
        res.json({ coin, price, ts: Math.floor(Date.now() / 1000) });
      } catch (e) {
        const snippet = raw && raw.slice(0,300);
        res.status(502).json({ error: 'Parse error from CoinGecko response', message: String(e), snippet });
      }
    });
  }).on('error', (err) => {
    res.status(500).json({ error: 'Request failed', message: String(err) });
  });
});

// POST /api/trading/buy - SỬA ĐỂ DÙNG DATABASE
router.post('/buy', auth.ensureAuth, (req, res) => {
  const { coin, amount, price } = req.body;
  const user = req.session.user;
  
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Validate input
  if (!coin || !amount || !price || amount <= 0 || price <= 0) {
    return res.status(400).json({ error: 'Thông tin giao dịch không hợp lệ' });
  }

  const totalCost = amount * price;

  // LẤY SỐ DƯ TỪ DATABASE
  db.query('SELECT balance FROM wallets WHERE user_id = ?', [user.id], (errWallet, walletRows) => {
    if (errWallet) {
      console.error('[tradingApi] Buy wallet error:', errWallet);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!walletRows || walletRows.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy ví. Vui lòng đăng nhập lại.' });
    }

    const currentBalance = Number(walletRows[0].balance) || 0;

    // Kiểm tra số dư
    if (currentBalance < totalCost) {
      return res.status(400).json({ 
        error: `Không đủ tiền! Cần $${totalCost.toFixed(2)}, có $${currentBalance.toFixed(2)}` 
      });
    }

    const coinId = COIN_ID_MAP[coin] || coin.toLowerCase();
    const symbol = coin;

    // Bắt đầu transaction
    db.query('START TRANSACTION', (errStart) => {
      if (errStart) {
        console.error('[tradingApi] Start transaction error:', errStart);
        return res.status(500).json({ error: 'Database error' });
      }

      // Insert giao dịch
      const sqlInsert = 'INSERT INTO transactions (user_id, coin_id, symbol, type, amount, price) VALUES (?, ?, ?, ?, ?, ?)';
      db.query(sqlInsert, [user.id, coinId, symbol, 'buy', amount, price], (errInsert) => {
        if (errInsert) {
          console.error('[tradingApi] Buy insert error:', errInsert);
          db.query('ROLLBACK');
          return res.status(500).json({ error: 'Database error' });
        }

        // Trừ tiền từ wallet
        const sqlUpdate = 'UPDATE wallets SET balance = balance - ? WHERE user_id = ?';
        db.query(sqlUpdate, [totalCost, user.id], (errUpdate) => {
          if (errUpdate) {
            console.error('[tradingApi] Buy update wallet error:', errUpdate);
            db.query('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }

          // Commit transaction
          db.query('COMMIT', (errCommit) => {
            if (errCommit) {
              console.error('[tradingApi] Commit error:', errCommit);
              db.query('ROLLBACK');
              return res.status(500).json({ error: 'Database error' });
            }

            // Lấy số dư mới
            db.query('SELECT balance FROM wallets WHERE user_id = ?', [user.id], (errBalance, balanceRows) => {
              const newBalance = balanceRows && balanceRows[0] ? Number(balanceRows[0].balance) : currentBalance - totalCost;

              console.log(`[Trading] User ${user.id} bought ${amount} ${coin} at $${price}. New balance: $${newBalance}`);

              res.json({ 
                success: true, 
                message: `Mua thành công ${amount} ${coin} với giá $${totalCost.toFixed(2)}`,
                balance: newBalance
              });
            });
          });
        });
      });
    });
  });
});

// POST /api/trading/sell - SỬA ĐỂ DÙNG DATABASE
router.post('/sell', auth.ensureAuth, (req, res) => {
  const { coin, amount, price } = req.body;
  const user = req.session.user;
  
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Validate input
  if (!coin || !amount || !price || amount <= 0 || price <= 0) {
    return res.status(400).json({ error: 'Thông tin giao dịch không hợp lệ' });
  }

  const coinId = COIN_ID_MAP[coin] || coin.toLowerCase();
  const symbol = coin;

  // Kiểm tra số lượng coin đang có
  const checkSql = 'SELECT SUM(CASE WHEN type = "buy" THEN amount ELSE -amount END) as holding FROM transactions WHERE user_id = ? AND coin_id = ?';
  db.query(checkSql, [user.id, coinId], (errCheck, rows) => {
    if (errCheck) {
      console.error('[tradingApi] Sell check error:', errCheck);
      return res.status(500).json({ error: 'Database error' });
    }

    const holding = Number(rows[0]?.holding) || 0;

    if (holding < amount) {
      return res.status(400).json({ 
        error: `Không đủ ${coin} để bán! Có ${holding.toFixed(8)}, muốn bán ${amount}` 
      });
    }

    const totalProceeds = amount * price;

    // Bắt đầu transaction
    db.query('START TRANSACTION', (errStart) => {
      if (errStart) {
        console.error('[tradingApi] Start transaction error:', errStart);
        return res.status(500).json({ error: 'Database error' });
      }

      // Insert giao dịch
      const sqlInsert = 'INSERT INTO transactions (user_id, coin_id, symbol, type, amount, price) VALUES (?, ?, ?, ?, ?, ?)';
      db.query(sqlInsert, [user.id, coinId, symbol, 'sell', amount, price], (errInsert) => {
        if (errInsert) {
          console.error('[tradingApi] Sell insert error:', errInsert);
          db.query('ROLLBACK');
          return res.status(500).json({ error: 'Database error' });
        }

        // Cộng tiền vào wallet
        const sqlUpdate = 'UPDATE wallets SET balance = balance + ? WHERE user_id = ?';
        db.query(sqlUpdate, [totalProceeds, user.id], (errUpdate) => {
          if (errUpdate) {
            console.error('[tradingApi] Sell update wallet error:', errUpdate);
            db.query('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }

          // Commit transaction
          db.query('COMMIT', (errCommit) => {
            if (errCommit) {
              console.error('[tradingApi] Commit error:', errCommit);
              db.query('ROLLBACK');
              return res.status(500).json({ error: 'Database error' });
            }

            // Lấy số dư mới
            db.query('SELECT balance FROM wallets WHERE user_id = ?', [user.id], (errBalance, balanceRows) => {
              const newBalance = balanceRows && balanceRows[0] ? Number(balanceRows[0].balance) : 0;

              console.log(`[Trading] User ${user.id} sold ${amount} ${coin} at $${price}. New balance: $${newBalance}`);

              res.json({ 
                success: true, 
                message: `Bán thành công ${amount} ${coin} với giá $${totalProceeds.toFixed(2)}`,
                balance: newBalance
              });
            });
          });
        });
      });
    });
  });
});

// GET /api/trading/portfolio
router.get('/portfolio', auth.ensureAuth, (req, res) => {
  const user = req.session.user;
  
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Lấy số dư từ database
  db.query('SELECT balance FROM wallets WHERE user_id = ?', [user.id], (errWallet, walletRows) => {
    if (errWallet) {
      console.error('[tradingApi] Portfolio wallet error:', errWallet);
      return res.status(500).json({ error: 'Database error' });
    }

    const balance = walletRows && walletRows[0] ? Number(walletRows[0].balance) : 0;

    // Lấy holdings
    const sql = `
      SELECT coin_id,
             symbol,
             SUM(CASE WHEN type = 'buy' THEN amount ELSE -amount END) AS holding
      FROM transactions
      WHERE user_id = ?
      GROUP BY coin_id, symbol
      HAVING holding > 0
    `;

    db.query(sql, [user.id], (errHoldings, rows) => {
      if (errHoldings) {
        console.error('[tradingApi] Portfolio query error:', errHoldings);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        balance: balance,
        holdings: rows
      });
    });
  });
});

module.exports = router;