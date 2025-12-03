const express = require('express');
const https = require('https');
const marketService = require('../services/marketService');
const db = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Helper: tìm coin trong bảng `coins` theo symbol hoặc coin_id (vd: 'BTC' hoặc 'bitcoin')
function findCoin(key, cb) {
  if (!key) return cb(null, null);
  const k = String(key).trim();
  db.query('SELECT id, coin_id, symbol, name FROM coins WHERE LOWER(symbol) = LOWER(?) OR LOWER(coin_id) = LOWER(?) LIMIT 1', [k, k], (err, rows) => {
    if (err) return cb(err);
    if (!rows || rows.length === 0) return cb(null, null);
    cb(null, rows[0]);
  });
}

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
  const { coin } = req.body;
  const amount = parseFloat(req.body.amount);
  const price = parseFloat(req.body.price);
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Validate input
  if (!coin || !Number.isFinite(amount) || !Number.isFinite(price) || amount <= 0 || price <= 0) {
    return res.status(400).json({ error: 'Thông tin giao dịch không hợp lệ' });
  }

  const totalCost = amount * price;

  // First find coin row in DB
  findCoin(coin, (errFind, coinRow) => {
    if (errFind) {
      console.error('[tradingApi] Find coin error:', errFind);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!coinRow) return res.status(400).json({ error: 'Coin không tồn tại trong hệ thống' });

    const coinDbId = coinRow.id; // integer FK
    const symbol = coinRow.symbol || coin;

    // Sử dụng kết nối từ pool để đảm bảo các lệnh trong transaction chạy trên cùng 1 connection
    db.getConnection((errConn, conn) => {
      if (errConn) {
        console.error('[tradingApi] Get connection error:', errConn);
        return res.status(500).json({ error: 'Database connection error' });
      }

      conn.beginTransaction(errBegin => {
        if (errBegin) {
          conn.release();
          console.error('[tradingApi] Begin transaction error:', errBegin);
          return res.status(500).json({ error: 'Database error' });
        }

        const selSql = 'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE';
        conn.query(selSql, [user.id], (errWallet, walletRows) => {
          if (errWallet) {
            console.error('[tradingApi] Buy wallet error:', errWallet);
            return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Database error' }); });
          }

          if (!walletRows || walletRows.length === 0) {
            return conn.rollback(() => { conn.release(); res.status(400).json({ error: 'Không tìm thấy ví. Vui lòng đăng nhập lại.' }); });
          }

          const currentBalance = Number(walletRows[0].balance) || 0;
          if (currentBalance < totalCost) {
            return conn.rollback(() => { conn.release(); res.status(400).json({ error: `Không đủ tiền! Cần $${totalCost.toFixed(2)}, có $${currentBalance.toFixed(2)}` }); });
          }

          const sqlInsert = 'INSERT INTO transactions (user_id, coin_id, type, amount, price) VALUES (?, ?, ?, ?, ?)';
          conn.query(sqlInsert, [user.id, coinDbId, 'buy', amount, price], (errInsert) => {
            if (errInsert) {
              console.error('[tradingApi] Buy insert error:', errInsert);
              return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Database error' }); });
            }

            const sqlUpdate = 'UPDATE wallets SET balance = balance - ? WHERE user_id = ?';
            conn.query(sqlUpdate, [totalCost, user.id], (errUpdate) => {
              if (errUpdate) {
                console.error('[tradingApi] Buy update wallet error:', errUpdate);
                return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Database error' }); });
              }

              conn.commit((errCommit) => {
                if (errCommit) {
                  console.error('[tradingApi] Commit error:', errCommit);
                  return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Database error' }); });
                }

                // Lấy số dư mới
                conn.query('SELECT balance FROM wallets WHERE user_id = ?', [user.id], (errBalance, balanceRows) => {
                  const newBalance = balanceRows && balanceRows[0] ? Number(balanceRows[0].balance) : currentBalance - totalCost;
                  console.log(`[Trading] User ${user.id} bought ${amount} ${coin} at $${price}. New balance: $${newBalance}`);
                  conn.release();
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
  });
});

// POST /api/trading/sell - SỬA ĐỂ DÙNG DATABASE
router.post('/sell', auth.ensureAuth, (req, res) => {
  const { coin } = req.body;
  const amount = parseFloat(req.body.amount);
  const price = parseFloat(req.body.price);
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Validate input
  if (!coin || !Number.isFinite(amount) || !Number.isFinite(price) || amount <= 0 || price <= 0) {
    return res.status(400).json({ error: 'Thông tin giao dịch không hợp lệ' });
  }

  const totalProceeds = amount * price;

  // Find coin row
  findCoin(coin, (errFind, coinRow) => {
    if (errFind) {
      console.error('[tradingApi] Find coin error:', errFind);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!coinRow) return res.status(400).json({ error: 'Coin không tồn tại' });

    const coinDbId = coinRow.id;
    const symbol = coinRow.symbol || coin;

    db.getConnection((errConn, conn) => {
      if (errConn) {
        console.error('[tradingApi] Get connection error:', errConn);
        return res.status(500).json({ error: 'Database connection error' });
      }

      conn.beginTransaction(errBegin => {
        if (errBegin) {
          conn.release();
          console.error('[tradingApi] Begin transaction error:', errBegin);
          return res.status(500).json({ error: 'Database error' });
        }

        const checkSql = 'SELECT SUM(CASE WHEN type = "buy" THEN amount ELSE -amount END) as holding FROM transactions WHERE user_id = ? AND coin_id = ?';
        conn.query(checkSql, [user.id, coinDbId], (errCheck, rows) => {
          if (errCheck) {
            console.error('[tradingApi] Sell check error:', errCheck);
            return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Database error' }); });
          }

          const holding = Number(rows[0]?.holding) || 0;
          if (holding < amount) {
            return conn.rollback(() => { conn.release(); res.status(400).json({ error: `Không đủ ${coin} để bán! Có ${holding.toFixed(8)}, muốn bán ${amount}` }); });
          }

          const sqlInsert = 'INSERT INTO transactions (user_id, coin_id, type, amount, price) VALUES (?, ?, ?, ?, ?)';
          conn.query(sqlInsert, [user.id, coinDbId, 'sell', amount, price], (errInsert) => {
            if (errInsert) {
              console.error('[tradingApi] Sell insert error:', errInsert);
              return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Database error' }); });
            }

            const sqlUpdate = 'UPDATE wallets SET balance = balance + ? WHERE user_id = ?';
            conn.query(sqlUpdate, [totalProceeds, user.id], (errUpdate) => {
              if (errUpdate) {
                console.error('[tradingApi] Sell update wallet error:', errUpdate);
                return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Database error' }); });
              }

              conn.commit((errCommit) => {
                if (errCommit) {
                  console.error('[tradingApi] Commit error:', errCommit);
                  return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Database error' }); });
                }

                conn.query('SELECT balance FROM wallets WHERE user_id = ?', [user.id], (errBalance, balanceRows) => {
                  const newBalance = balanceRows && balanceRows[0] ? Number(balanceRows[0].balance) : 0;
                  console.log(`[Trading] User ${user.id} sold ${amount} ${coin} at $${price}. New balance: $${newBalance}`);
                  conn.release();
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

    // Lấy holdings, join với coins để có symbol/coin_id
    const sql = `
      SELECT c.coin_id as coin_key, c.symbol, SUM(CASE WHEN t.type = 'buy' THEN t.amount ELSE -t.amount END) AS holding
      FROM transactions t
      JOIN coins c ON t.coin_id = c.id
      WHERE t.user_id = ?
      GROUP BY t.coin_id, c.symbol, c.coin_id
      HAVING holding > 0
    `;

    db.query(sql, [user.id], (errHoldings, rows) => {
      if (errHoldings) {
        console.error('[tradingApi] Portfolio query error:', errHoldings);
        return res.status(500).json({ error: 'Database error' });
      }

      // format
      const holdings = (rows || []).map(r => ({ coin: r.coin_key, symbol: r.symbol, holding: Number(r.holding) }));

      res.json({ balance: balance, holdings });
    });
  });
});

module.exports = router;