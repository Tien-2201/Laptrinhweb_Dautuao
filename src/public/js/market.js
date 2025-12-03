
async function fetchMarketData() {
  try {
    let coins = [];
    try {
      const creq = await fetch('/market/coins');
      if (creq.ok) {
        const cj = await creq.json();
        coins = cj.coins || [];
      }
    } catch (e) {
      // Silently ignore coin fetch errors
    }

    ensureRows(coins);

    const res = await fetch('/market/data');
    if (!res.ok) throw new Error('Server response ' + res.status);
    const json = await res.json();
    const data = json.data || [];
    const updatedAt = json.updatedAt || 0;
    const isStale = !!json.isStale;

    updateTable(data || []);
    showStaleIndicator(isStale, updatedAt);
  } catch (e) {
    console.error('fetchMarketData error', e);
  }
}

function ensureRows(coins) {
  const tbody = document.querySelector('.market-table tbody');
  if (!tbody) return;
  coins.forEach(c => {
    if (!c || !c.coin_id) return;
    const existing = tbody.querySelector(`tr[data-coin-id="${c.coin_id}"]`);
    if (existing) return;

    const tr = document.createElement('tr');
    tr.setAttribute('data-coin-id', c.coin_id);
    tr.innerHTML = `
      <td>
        <div class="crypto-name">
          <div class="crypto-icon">${(c.symbol||'').toUpperCase()}</div>
          <div>
            <div>${c.name || c.coin_id}</div>
            <small class="crypto-symbol">${(c.symbol||'').toUpperCase()}</small>
          </div>
        </div>
      </td>
      <td><strong>-</strong></td>
      <td data-change-24h>-</td>
      <td data-change-7d>-</td>
      <td>-</td>
      <td><a href="/trading?coin=${(c.symbol||'').toUpperCase()}" class="btn-trade">Giao dịch</a></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateTable(data) {
  data.forEach(c => {
    const row = document.querySelector(`tr[data-coin-id="${c.id}"]`);
    const card = document.querySelector(`.market-card[data-coin-id="${c.id}"]`);
    const priceVal = c.current_price ?? c.price ?? c.currentPrice;
    const ch24 = c.price_change_percentage_24h_in_currency ?? c.change24h ?? c.price_change_percentage_24h;
    const ch7 = c.price_change_percentage_7d_in_currency ?? c.change7d ?? c.price_change_percentage_7d;
    const marketCap = c.market_cap ?? c.marketCap;

    if (row) {
      const tds = row.querySelectorAll('td');

      if (tds[1]) {
        const strong = tds[1].querySelector('strong');
        const formatted = `$${formatNumber(priceVal)}`;
        if (strong) {
          strong.textContent = formatted;
        } else {
          tds[1].textContent = formatted;
        }
      }

      if (tds[2]) {
        tds[2].textContent = formatPercent(ch24);
        tds[2].classList.toggle('text-positive', ch24 >= 0);
        tds[2].classList.toggle('text-negative', ch24 < 0);
      }
      if (tds[3]) {
        tds[3].textContent = formatPercent(ch7);
        tds[3].classList.toggle('text-positive', ch7 >= 0);
        tds[3].classList.toggle('text-negative', ch7 < 0);
      }
      if (tds[4]) tds[4].textContent = `$${formatMarketCap(marketCap)}`;
    }

    if (card) {
      const priceEl = card.querySelector('.price-value');
      const change24hEl = card.querySelector('.change-24h');
      const change7dEl = card.querySelector('.change-7d');
      const marketcapEl = card.querySelector('.marketcap-value');

      if (priceEl) {
        const strong = priceEl.querySelector('strong');
        const formatted = `$${formatNumber(priceVal)}`;
        if (strong) {
          strong.textContent = formatted;
        } else {
          priceEl.textContent = formatted;
        }
      }

      if (change24hEl) {
        change24hEl.textContent = formatPercent(ch24);
        change24hEl.classList.toggle('text-positive', ch24 >= 0);
        change24hEl.classList.toggle('text-negative', ch24 < 0);
      }

      if (change7dEl) {
        change7dEl.textContent = formatPercent(ch7);
        change7dEl.classList.toggle('text-positive', ch7 >= 0);
        change7dEl.classList.toggle('text-negative', ch7 < 0);
      }

      if (marketcapEl) {
        marketcapEl.textContent = `$${formatMarketCap(marketCap)}`;
      }
    }
  });
}

function formatNumber(n) {
  if (n === null || n === undefined) return '-';
  if (n >= 1) return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
  return Number(n).toFixed(4);
}

function formatPercent(p) {
  if (p === null || p === undefined) return '-';
  const sign = p >= 0 ? '+' : '';
  return `${sign}${Number(p).toFixed(2)}%`;
}

function formatMarketCap(m) {
  if (m === null || m === undefined) return '-';
  if (m >= 1e12) return (m / 1e12).toFixed(2) + 'T';
  if (m >= 1e9) return (m / 1e9).toFixed(2) + 'B';
  if (m >= 1e6) return (m / 1e6).toFixed(2) + 'M';
  return Number(m).toLocaleString();
}
document.addEventListener('DOMContentLoaded', () => {
  fetchMarketData();
  setInterval(fetchMarketData, 60 * 1000);
});

function showStaleIndicator(isStale, updatedAt) {
  const header = document.querySelector('.page-header');
  if (!header) return;
  let badge = document.getElementById('market-stale-indicator');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'market-stale-indicator';
    badge.style.marginTop = '8px';
    badge.style.fontSize = '0.9rem';
    header.appendChild(badge);
  }
  if (isStale) {
    const ageMin = updatedAt ? Math.round((Date.now() - updatedAt) / 60000) : null;
    badge.textContent = ageMin ? `Dữ liệu đã cũ: ${ageMin} phút` : 'Dữ liệu hiện tại đang bị chậm (cache)';
    badge.style.color = '#b45309';
  } else {
    badge.textContent = 'Dữ liệu cập nhật';
    badge.style.color = '#16a34a';
  }
}
