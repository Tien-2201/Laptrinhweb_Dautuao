
let COIN_ID_MAP = {}; // symbol -> coin_key (coin_id string used by CoinGecko)
let EXTERNAL_CHART = {}; // symbol -> external chart info

async function loadCoinList() {
  try {
    const res = await fetch('/market/coins');
    if (!res.ok) throw new Error('Failed to load coins');
    const j = await res.json();
    const coins = j.coins || [];
    // build symbol->coin_key map
    COIN_ID_MAP = {};
    EXTERNAL_CHART = {};
    const sel = document.getElementById('tradingCoinSelect');
    coins.forEach(c => {
      if (c && c.symbol && c.coin_id) {
        const sym = (c.symbol || '').toUpperCase();
        COIN_ID_MAP[sym] = c.coin_id;
        EXTERNAL_CHART[sym] = { url: `https://www.tradingview.com/symbols/${sym}USD/`, text: 'Xem chi tiết trên TradingView' };
        // populate select if option for symbol not present
        if (sel) {
          const exists = Array.from(sel.options).some(o => (o.value || '').toUpperCase() === sym);
          if (!exists) {
            const opt = document.createElement('option');
            opt.value = sym;
            opt.text = `${sym}`;
            sel.appendChild(opt);
          }
        }
      }
    });
  } catch (e) {
    console.error('loadCoinList error', e);
  }
}


let pricePollHandle = null;

const urlParams = new URLSearchParams(window.location.search);
const coinParam = urlParams.get('coin');

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('tradingCoinSelect');
  if (coinParam && sel) sel.value = coinParam;
  if (sel) sel.addEventListener('change', onCoinChange);

  loadCoinList().then(() => updateExternalChart());
  setInterval(() => loadCoinList(), 60 * 1000);

  loadPortfolio();
  initializePrice();
});

async function initializePrice() {
  const sel = document.getElementById('tradingCoinSelect');
  const coin = sel ? sel.value : 'BTC';
  const id = COIN_ID_MAP[coin] || Object.values(COIN_ID_MAP)[0] || 'bitcoin';
  try {
    const p = await fetchPriceFromCache(id);
    if (p != null) {
      const priceInput = document.getElementById('tradingPrice');
      if (priceInput) priceInput.value = p;
    }
  } catch (e) {
    // Silently ignore cache fetch errors
  }
  startPricePolling();
}

async function loadPortfolio() {
  try {
    const res = await fetch('/api/trading/portfolio');
    if (!res.ok) throw new Error('Failed to load portfolio');
    const data = await res.json();

    const balanceEl = document.getElementById('usdBalance');
    if (balanceEl) balanceEl.textContent = data.balance.toFixed(2) + " USD";

    const coinListEl = document.getElementById('coinHoldings');
    if (coinListEl) {
      coinListEl.innerHTML = '';
      data.holdings.forEach(row => {
        const li = document.createElement('li');
        const label = row.symbol || row.coin || row.coin_id || '';
        li.textContent = `${label.toUpperCase()}: ${row.holding}`;
        coinListEl.appendChild(li);
      });
    }
  } catch (err) {
    console.error('loadPortfolio error:', err);
  }
}

function onCoinChange() {
  updateExternalChart();
  updateCoinPrice();
}

async function updateCoinPrice() {
  const sel = document.getElementById('tradingCoinSelect');
  const coin = sel ? sel.value : 'BTC';
  const id = COIN_ID_MAP[coin] || Object.values(COIN_ID_MAP)[0] || 'bitcoin';
  try {
    const p = await fetchPriceFromCache(id);
    if (p != null) {
      const priceInput = document.getElementById('tradingPrice');
      if (priceInput) priceInput.value = p;
    }
  } catch (e) {
    // Silently ignore cache fetch errors
  }
  fetchAndUpdatePrice();
}

async function fetchPriceFromCache(id) {
  try {
    const res = await fetch('/market/data');
    if (!res.ok) throw new Error('server /market/data ' + res.status);
    const json = await res.json();
    const data = json.data || [];
    const found = data.find(d => d.id === id);
    if (found && (found.price != null)) return Number(found.price);
    // fallback: try matching by symbol
    const bySymbol = data.find(d => (d.symbol || '').toUpperCase() === id.toUpperCase() || (d.symbol || '').toUpperCase() === id.toUpperCase());
    if (bySymbol && (bySymbol.price != null)) return Number(bySymbol.price);
    return null;
  } catch (e) {
    throw e;
  }
}

function updateExternalChart() {
  const sel = document.getElementById('tradingCoinSelect');
  const coin = sel ? sel.value : 'BTC';
  const info = EXTERNAL_CHART[coin] || EXTERNAL_CHART['BTC'];
  const link = document.getElementById('externalChartLink');
  const textLink = document.getElementById('externalChartTextLink');
  if (link) link.href = info.url;
  if (textLink) { textLink.href = info.url; textLink.textContent = info.text; }
}

async function startPricePolling() {
  if (pricePollHandle) clearInterval(pricePollHandle);
  await fetchAndUpdatePrice();
  pricePollHandle = setInterval(fetchAndUpdatePrice, 60 * 1000);
}

async function fetchAndUpdatePrice() {
  try {
    const sel = document.getElementById('tradingCoinSelect');
    const coin = sel ? sel.value : 'BTC';
    const id = COIN_ID_MAP[coin] || Object.values(COIN_ID_MAP)[0] || 'bitcoin';
    const res = await fetch(`/api/trading/price?coin=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('price api ' + res.status);
    const json = await res.json();
    const price = Number(json.price);

    // update price input
    const priceInput = document.getElementById('tradingPrice');
    if (priceInput) priceInput.value = price;

    calculateTradingTotal();
  } catch (e) {
    console.error('[trading.js] fetchAndUpdatePrice error', e);
  }
}

function calculateTradingTotal() {
  const amount = parseFloat(document.getElementById('tradingAmount').value) || 0;
  const price = parseFloat(document.getElementById('tradingPrice').value) || 0;
  const total = amount * price;
  const totalInput = document.getElementById('tradingTotal');
  if (totalInput) totalInput.value = total.toFixed(2);
}

async function executeTradingAction(type) {
  const coin = document.getElementById('tradingCoinSelect').value;
  const amount = parseFloat(document.getElementById('tradingAmount').value);
  const price = parseFloat(document.getElementById('tradingPrice').value);
  const total = parseFloat(document.getElementById('tradingTotal').value);

  if (!amount || amount <= 0 || !price || price <= 0) {
    showToast('Vui lòng nhập số lượng hợp lệ!', 'warn');
    return;
  }

  try {
    const response = await fetch(`/api/trading/${type}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ coin, amount, price }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      showToast(result.message, 'success');
      document.getElementById('tradingAmount').value = '';
      document.getElementById('tradingTotal').value = '';

      if (typeof loadPortfolio === 'function') {
        await loadPortfolio();
      }
    } else {
      showToast(result.error || 'Lỗi không xác định', 'error');
    }
  } catch (error) {
    console.error('Trading error:', error);
    showToast('Lỗi kết nối mạng', 'error');
  }
}
