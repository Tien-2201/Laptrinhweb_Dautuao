
const https = require('https');

// CoinGecko ids for the 5 coins shown on the market page
const COIN_IDS = ['bitcoin','ethereum','binancecoin','solana','ripple'];

class MarketService {
  constructor() {
    this.cache = { updatedAt: null, data: [] };
    this.minInterval = 60 * 1000; // 1 minutes
    this.maxBackoff = 30 * 60 * 1000; // 30 minutes
    this.backoffMs = 0;
    this._stopped = false;
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
    const ids = COIN_IDS.join(',');
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d`;

    const options = {
      headers: {
        'User-Agent': 'node.js',
        'Accept': 'application/json'
      }
    };

    https.get(url, options, (res) => {
      const { statusCode } = res;
      const contentType = res.headers['content-type'] || '';
      const retryAfter = res.headers['retry-after'];

      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (statusCode === 429) {
          console.warn('[MarketService] Rate limited (429) from CoinGecko');
          const snippet = raw && raw.toString().slice(0, 500);
          console.warn('[MarketService] Response snippet:', snippet);
          // Respect Retry-After if provided (seconds)
          let waitMs = 0;
          if (retryAfter) {
            const ra = parseInt(retryAfter, 10);
            if (!Number.isNaN(ra) && ra > 0) waitMs = ra * 1000;
          }
          if (!waitMs) {
            // exponential backoff
            this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
            waitMs = this.backoffMs;
          } else {
            // set backoff to at least retry-after
            this.backoffMs = Math.max(this.backoffMs || 0, waitMs);
          }
          // do NOT overwrite cache on 429, serve stale data until next success
          this._scheduleNext(waitMs);
          return;
        }

        if (statusCode !== 200) {
          console.error(`[MarketService] Unexpected status ${statusCode} from CoinGecko`);
          const snippet = raw && raw.toString().slice(0, 500);
          console.error('[MarketService] Response snippet:', snippet);
          // schedule next attempt with backoff
          this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
          this._scheduleNext(this.backoffMs);
          return;
        }

        if (!contentType.includes('application/json')) {
          console.error('[MarketService] Unexpected content-type:', contentType);
          const snippet = raw && raw.toString().slice(0, 500);
          console.error('[MarketService] Response snippet:', snippet);
          // schedule next attempt
          this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
          this._scheduleNext(this.backoffMs);
          return;
        }

        try {
          const json = JSON.parse(raw);
          // normalize
          const normalized = json.map(item => ({
            id: item.id,
            symbol: (item.symbol || '').toUpperCase(),
            name: item.name,
            price: (item.current_price != null) ? Number(item.current_price) : null,
            change24h: (item.price_change_percentage_24h_in_currency != null) ? Number(item.price_change_percentage_24h_in_currency) : (item.price_change_percentage_24h != null ? Number(item.price_change_percentage_24h) : null),
            change7d: (item.price_change_percentage_7d_in_currency != null) ? Number(item.price_change_percentage_7d_in_currency) : (item.price_change_percentage_7d != null ? Number(item.price_change_percentage_7d) : null),
            marketCap: (item.market_cap != null) ? Number(item.market_cap) : null
          }));

          this.cache = { updatedAt: Date.now(), data: normalized };
          // reset backoff on success
          this.backoffMs = 0;
          this._scheduleNext(this.minInterval);
        } catch (e) {
          console.error('[MarketService] Parse error', e);
          const snippet = raw && raw.toString().slice(0, 500);
          console.error('[MarketService] Response snippet:', snippet);
          // schedule next attempt
          this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
          this._scheduleNext(this.backoffMs);
        }
      });
    }).on('error', (e) => {
      console.error('[MarketService] Request error', e);
      // schedule next attempt with exponential backoff
      this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, this.maxBackoff) : this.minInterval * 2;
      this._scheduleNext(this.backoffMs);
    });
  }

  getData() {
    return this.cache;
  }
}

module.exports = new MarketService();
