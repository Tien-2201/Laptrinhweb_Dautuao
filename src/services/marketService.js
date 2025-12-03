
const https = require('https');
const db = require('../config/db');

class MarketService {
  constructor() {
    this.cache = { updatedAt: null, data: [] };
    this.minInterval = 60 * 1000; // 1 minute
    this.maxBackoff = 30 * 60 * 1000; // 30 minutes
    this.backoffMs = 0;
    this._stopped = false;
    this._nextTimer = null;
    // start scheduling loop
    this._scheduleNext(0);
  }

  _scheduleNext(delayMs) {
    if (this._stopped) return;
    const d = typeof delayMs === 'number' && delayMs >= 0 ? delayMs : (this.backoffMs || this.minInterval);
    if (this._nextTimer) clearTimeout(this._nextTimer);
    this._nextTimer = setTimeout(() => this.fetchPrices(), d);
    console.debug(`[MarketService] Next fetch scheduled in ${d} ms`);
  }

  stop() {
    this._stopped = true;
    if (this._nextTimer) clearTimeout(this._nextTimer);
  }

  fetchPrices() {
    // Lấy danh sách coin từ database
    db.query('SELECT coin_id, symbol FROM coins WHERE is_active = 1 ORDER BY display_order ASC', (err, rows) => {
      if (err) {
        console.error('[MarketService] DB error when reading coins:', err);
        this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
        this._scheduleNext(this.backoffMs);
        return;
      }

      const ids = (rows || []).map(r => r.coin_id).filter(Boolean).join(',');
      if (!ids) {
        console.warn('[MarketService] No active coins found in DB');
        this._scheduleNext(this.minInterval);
        return;
      }

      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}&price_change_percentage=24h,7d`;
      const options = { headers: { 'User-Agent': 'node.js', 'Accept': 'application/json' } };

      https.get(url, options, (res) => {
        const { statusCode } = res;
        const contentType = res.headers['content-type'] || '';
        const retryAfter = res.headers['retry-after'];

        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          if (statusCode === 429) {
            console.warn('[MarketService] Rate limited (429) from CoinGecko');
            let waitMs = 0;
            if (retryAfter) {
              const ra = parseInt(retryAfter, 10);
              if (!Number.isNaN(ra) && ra > 0) waitMs = ra * 1000;
            }
            if (!waitMs) {
              this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
              waitMs = this.backoffMs;
            } else {
              this.backoffMs = Math.max(this.backoffMs || 0, waitMs);
            }
            this._scheduleNext(waitMs);
            return;
          }

          if (statusCode !== 200) {
            console.error(`[MarketService] Unexpected status ${statusCode} from CoinGecko`);
            this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
            this._scheduleNext(this.backoffMs);
            return;
          }

          if (!contentType.includes('application/json')) {
            console.error('[MarketService] Unexpected content-type:', contentType);
            this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
            this._scheduleNext(this.backoffMs);
            return;
          }

          try {
            const json = JSON.parse(raw);
            const normalized = (json || []).map(item => ({
              id: item.id,
              symbol: (item.symbol || '').toUpperCase(),
              name: item.name,
              price: (item.current_price != null) ? Number(item.current_price) : null,
              change24h: (item.price_change_percentage_24h_in_currency != null) ? Number(item.price_change_percentage_24h_in_currency) : (item.price_change_percentage_24h != null ? Number(item.price_change_percentage_24h) : null),
              change7d: (item.price_change_percentage_7d_in_currency != null) ? Number(item.price_change_percentage_7d_in_currency) : (item.price_change_percentage_7d != null ? Number(item.price_change_percentage_7d) : null),
              marketCap: (item.market_cap != null) ? Number(item.market_cap) : null
            }));

            this.cache = { updatedAt: Date.now(), data: normalized };
            this.backoffMs = 0;
            this._scheduleNext(this.minInterval);
          } catch (e) {
            console.error('[MarketService] Parse error', e);
            this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
            this._scheduleNext(this.backoffMs);
          }
        });
      }).on('error', (e) => {
        console.error('[MarketService] Request error', e);
        this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
        this._scheduleNext(this.backoffMs);
      });
    });
  }

  getData() {
    return this.cache;
  }
}

module.exports = new MarketService();
