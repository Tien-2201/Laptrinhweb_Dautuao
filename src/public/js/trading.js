
const COIN_ID_MAP = { BTC: 'bitcoin', ETH: 'ethereum', BNB: 'binancecoin', SOL: 'solana', XRP: 'ripple' };

const EXTERNAL_CHART = {
  BTC: { url: 'https://www.tradingview.com/symbols/BTCUSD/', text: 'Xem chi tiết trên TradingView' },
  ETH: { url: 'https://www.tradingview.com/symbols/ETHUSD/', text: 'Xem chi tiết trên TradingView' },
  BNB: { url: 'https://www.tradingview.com/symbols/BNBUSD/', text: 'Xem chi tiết trên TradingView' },
  SOL: { url: 'https://www.tradingview.com/symbols/SOLUSD/', text: 'Xem chi tiết trên TradingView' },
  XRP: { url: 'https://www.tradingview.com/symbols/XRPUSD/', text: 'Xem chi tiết trên TradingView' }
};


let pricePollHandle = null;

const urlParams = new URLSearchParams(window.location.search);
const coinParam = urlParams.get('coin');

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('tradingCoinSelect');
  if (coinParam && sel) sel.value = coinParam;
  if (sel) sel.addEventListener('change', onCoinChange);
  // initial update
  updateExternalChart();

  // 
  loadPortfolio();

  // set immediate price from server cache (if available) then start polling
  (async () => {
    const sel = document.getElementById('tradingCoinSelect');
    const coin = sel ? sel.value : 'BTC';
    const id = COIN_ID_MAP[coin] || COIN_ID_MAP['BTC'];
    try {
      const p = await fetchPriceFromCache(id);
      if (p != null) {
        const priceInput = document.getElementById('tradingPrice');
        if (priceInput) priceInput.value = p;
      }
    } catch (e) {
      console.debug('[trading.js] fetchPriceFromCache initial error', e);
    }
    startPricePolling();
  })();
});

async function loadPortfolio() {
  try {
    const res = await fetch('/api/trading/portfolio');
    if (!res.ok) throw new Error('Failed to load portfolio');
    const data = await res.json();

    // Hiển thị số dư USD
    const balanceEl = document.getElementById('usdBalance');
    if (balanceEl) balanceEl.textContent = data.balance.toFixed(2) + " USD";

    // Hiển thị số coin
    const coinListEl = document.getElementById('coinHoldings');
    if (coinListEl) {
      coinListEl.innerHTML = '';
      data.holdings.forEach(row => {
        const li = document.createElement('li');
        li.textContent = `${row.coin_id.toUpperCase()}: ${row.holding}`;
        coinListEl.appendChild(li);
      });
    }

  } catch (err) {
    console.error('loadPortfolio error:', err);
  }
}


function onCoinChange() {
  updateExternalChart();
  // immediately set price from server cache when switching coin (fast fallback), then fetch live price
  (async () => {
    const sel = document.getElementById('tradingCoinSelect');
    const coin = sel ? sel.value : 'BTC';
    const id = COIN_ID_MAP[coin] || COIN_ID_MAP['BTC'];
    try {
      const p = await fetchPriceFromCache(id);
      if (p != null) {
        const priceInput = document.getElementById('tradingPrice');
        if (priceInput) priceInput.value = p;
      }
    } catch (e) {
      console.debug('[trading.js] fetchPriceFromCache error', e);
    }
    fetchAndUpdatePrice();
  })();
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
    const id = COIN_ID_MAP[coin] || COIN_ID_MAP['BTC'];
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
    alert('Vui lòng nhập số lượng hợp lệ!');
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
      alert(result.message);
      document.getElementById('tradingAmount').value = '';
      document.getElementById('tradingTotal').value = '';

      if (typeof loadPortfolio === 'function') {
        await loadPortfolio();
      }
    } else {
      alert(result.error || 'Lỗi không xác định');
    }
  } catch (error) {
    console.error('Trading error:', error);
    alert('Lỗi kết nối mạng');
  }
}
