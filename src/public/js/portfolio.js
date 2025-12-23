// Portfolio Card Pagination (Client-side)
const PORTFOLIO_CARDS_PER_PAGE = 4;
let portfolioCurrentPage = 1;
let portfolioTotalPages = 1;
let portfolioAllCards = [];

document.addEventListener('DOMContentLoaded', () => {
  const cardGrid = document.querySelector('.portfolio-cards-grid');
  if (!cardGrid) return;

  portfolioAllCards = Array.from(cardGrid.querySelectorAll('.portfolio-card'));
  portfolioTotalPages = Math.ceil(portfolioAllCards.length / PORTFOLIO_CARDS_PER_PAGE);

  if (portfolioAllCards.length > PORTFOLIO_CARDS_PER_PAGE) {
    showPortfolioPage(1);
  } else {
    // Hide pagination if only 1 page
    const pagination = document.querySelector('.portfolio-pagination');
    if (pagination) pagination.style.display = 'none';
  }

  // Bind pagination buttons
  const prevBtn = document.querySelector('.portfolio-prev');
  const nextBtn = document.querySelector('.portfolio-next');
  if (prevBtn) prevBtn.addEventListener('click', () => showPortfolioPage(portfolioCurrentPage - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => showPortfolioPage(portfolioCurrentPage + 1));
});

function showPortfolioPage(pageNum) {
  if (pageNum < 1 || pageNum > portfolioTotalPages) return;

  portfolioCurrentPage = pageNum;

  // Hide all cards
  portfolioAllCards.forEach(card => card.style.display = 'none');

  // Show cards for current page
  const start = (pageNum - 1) * PORTFOLIO_CARDS_PER_PAGE;
  const end = start + PORTFOLIO_CARDS_PER_PAGE;
  for (let i = start; i < end && i < portfolioAllCards.length; i++) {
    portfolioAllCards[i].style.display = 'block';
  }

  // Update pagination info
  const pageCurrentEl = document.querySelector('.portfolio-pagination .page-current');
  const pageTotalEl = document.querySelector('.portfolio-pagination .page-total');
  if (pageCurrentEl) pageCurrentEl.textContent = portfolioCurrentPage;
  if (pageTotalEl) pageTotalEl.textContent = portfolioTotalPages;

  // Update button visibility
  const prevBtn = document.querySelector('.portfolio-prev');
  const nextBtn = document.querySelector('.portfolio-next');
  if (prevBtn) prevBtn.style.display = pageNum > 1 ? 'block' : 'none';
  if (nextBtn) nextBtn.style.display = pageNum < portfolioTotalPages ? 'block' : 'none';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


function parseMoney(str) {
  if (!str) return 0;
  const s = String(str).replace(/[^0-9.\-]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(n) {
  if (n == null || !Number.isFinite(n)) return '$-';
  const v = Number(n);
  return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function formatPercent(n) {
  if (n == null || !Number.isFinite(n)) return '0.00%';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

async function fetchMarketCache() {
  const res = await fetch('/market/data');
  if (!res.ok) throw new Error('market/data ' + res.status);
  const json = await res.json();
  const data = json && json.data ? json.data : [];
  const map = new Map(); // SYMBOL(UPPER) -> price
  data.forEach(d => {
    if (!d) return;
    const sym = (d.symbol || '').toUpperCase();
    const price = d.current_price ?? d.price ?? d.currentPrice;
    if (sym && price != null) map.set(sym, Number(price));
  });
  return map;
}

function updatePortfolioTable(priceMap) {
  const rows = document.querySelectorAll('.portfolio-table tbody tr');
  let totalMarketValue = 0;
  rows.forEach(row => {
    const symEl = row.querySelector('.crypto-symbol');
    if (!symEl) return;
    const symbol = (symEl.textContent || '').trim().toUpperCase();
    if (!symbol) return;

    const qtyCell = row.querySelector('td[data-label="Số lượng"]') || row.children[1];
    const buyCell = row.querySelector('td[data-label="Giá mua"]') || row.children[2];
    const curCell = row.querySelector('td[data-label="Giá hiện tại"]') || row.children[3];
    const mvCell = row.querySelector('td[data-label="Tổng giá trị"] strong') || (row.children[4] && row.children[4].querySelector('strong'));
    const pnlCell = row.querySelector('td[data-label="Lãi/Lỗ"]') || row.children[5];

    const qty = parseMoney(qtyCell ? qtyCell.textContent : '0');
    const buyPrice = parseMoney(buyCell ? buyCell.textContent : '0');
    const price = priceMap.get(symbol);

    let marketValue = null;
    let pnl = null;
    if (price != null && Number.isFinite(price)) {
      curCell && (curCell.textContent = formatCurrency(price));
      marketValue = qty * price;
      mvCell && (mvCell.textContent = formatCurrency(marketValue));
      pnl = marketValue - (qty * buyPrice);
      if (pnlCell) {
        const sign = pnl > 0 ? '+' : (pnl < 0 ? '-' : '');
        pnlCell.textContent = sign + formatCurrency(Math.abs(pnl)).replace('$','');
        pnlCell.classList.remove('text-positive','text-negative','stat-muted');
        pnlCell.classList.add(pnl > 0 ? 'text-positive' : (pnl < 0 ? 'text-negative' : 'stat-muted'));
      }
      if (marketValue != null && Number.isFinite(marketValue)) totalMarketValue += marketValue;
    } else {
      curCell && (curCell.textContent = '-');
      mvCell && (mvCell.textContent = '-');
      if (pnlCell) {
        pnlCell.textContent = '-';
        pnlCell.classList.remove('text-positive','text-negative');
        pnlCell.classList.add('stat-muted');
      }
    }
  });
  return totalMarketValue;
}

function updatePortfolioCards(priceMap) {
  const cards = document.querySelectorAll('.portfolio-card');
  let totalMarketValue = 0;
  cards.forEach(card => {
    const symEl = card.querySelector('.crypto-symbol');
    const symbol = symEl ? (symEl.textContent || '').trim().toUpperCase() : '';
    if (!symbol) return;

    const values = card.querySelectorAll('.card-value');
    // Order: qty(0), buy(1), current(2), mv(3), pnl(4)
    const qty = parseMoney(values[0] ? values[0].textContent : '0');
    const buyPrice = parseMoney(values[1] ? values[1].textContent : '0');
    const price = priceMap.get(symbol);

    if (price != null && Number.isFinite(price)) {
      if (values[2]) values[2].textContent = formatCurrency(price);
      const marketValue = qty * price;
      if (values[3]) values[3].textContent = formatCurrency(marketValue);
      const pnl = marketValue - (qty * buyPrice);
      if (values[4]) {
        const sign = pnl > 0 ? '+' : (pnl < 0 ? '-' : '');
        values[4].textContent = sign + formatCurrency(Math.abs(pnl)).replace('$','');
        values[4].classList.remove('text-positive','text-negative','stat-muted');
        values[4].classList.add(pnl > 0 ? 'text-positive' : (pnl < 0 ? 'text-negative' : 'stat-muted'));
      }
      if (marketValue != null && Number.isFinite(marketValue)) totalMarketValue += marketValue;
    } else {
      if (values[2]) values[2].textContent = '-';
      if (values[3]) values[3].textContent = '-';
      if (values[4]) {
        values[4].textContent = '-';
        values[4].classList.remove('text-positive','text-negative');
        values[4].classList.add('stat-muted');
      }
    }
  });
  return totalMarketValue;
}

function updatePortfolioTotals(totalMarketValue) {
  // Read balance from the third stat card (Số dư khả dụng)
  const balanceEl = document.querySelector('.portfolio-stats .portfolio-stat-card:nth-child(3) .stat-value');
  const balanceUsd = parseMoney(balanceEl ? balanceEl.textContent : '0');

  const totalValue = balanceUsd + (Number(totalMarketValue) || 0);

  // Estimate pnl from DOM totals where possible, otherwise recompute from table rows
  let totalCost = 0;
  const rows = document.querySelectorAll('.portfolio-table tbody tr');
  rows.forEach(row => {
    const qty = parseMoney((row.querySelector('td[data-label="Số lượng"]') || row.children[1])?.textContent || '0');
    const buyPrice = parseMoney((row.querySelector('td[data-label="Giá mua"]') || row.children[2])?.textContent || '0');
    totalCost += qty * buyPrice;
  });
  const pnl = (Number(totalMarketValue) || 0) - totalCost;
  const pnlPct = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

  // Card 1: Tổng tài sản
  const totalValueEl = document.querySelector('.portfolio-stats .portfolio-stat-card:nth-child(1) .stat-value');
  const totalPnlEl1 = document.querySelector('.portfolio-stats .portfolio-stat-card:nth-child(1) .stat-change');
  if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);
  if (totalPnlEl1) {
    const sign = pnl > 0 ? '+' : (pnl < 0 ? '-' : '');
    totalPnlEl1.textContent = sign + formatCurrency(Math.abs(pnl)).replace('$','');
    totalPnlEl1.classList.remove('text-positive','text-negative','stat-muted');
    totalPnlEl1.classList.add(pnl > 0 ? 'text-positive' : (pnl < 0 ? 'text-negative' : 'stat-muted'));
  }

  // Card 2: Lợi nhuận/Lỗ
  const pnlValueEl = document.querySelector('.portfolio-stats .portfolio-stat-card:nth-child(2) .stat-value');
  const pnlPctEl = document.querySelector('.portfolio-stats .portfolio-stat-card:nth-child(2) .stat-change');
  if (pnlValueEl) {
    const sign = pnl > 0 ? '+' : (pnl < 0 ? '-' : '');
    pnlValueEl.textContent = sign + formatCurrency(Math.abs(pnl)).replace('$','');
    pnlValueEl.classList.remove('text-positive','text-negative','stat-muted');
    pnlValueEl.classList.add(pnl > 0 ? 'text-positive' : (pnl < 0 ? 'text-negative' : 'stat-muted'));
  }
  if (pnlPctEl) {
    pnlPctEl.textContent = formatPercent(pnlPct);
    pnlPctEl.classList.remove('text-positive','text-negative','stat-muted');
    pnlPctEl.classList.add(pnl > 0 ? 'text-positive' : (pnl < 0 ? 'text-negative' : 'stat-muted'));
  }
}

async function refreshPortfolioPrices() {
  try {
    const priceMap = await fetchMarketCache();
    const mvTable = updatePortfolioTable(priceMap);
    const mvCards = updatePortfolioCards(priceMap);
    const totalMarketValue = (mvTable || 0) || (mvCards || 0) ? (mvTable + mvCards) / (mvTable && mvCards ? 2 : 1) : 0;
    updatePortfolioTotals(totalMarketValue);
  } catch (e) {
    // Ignore transient errors
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Initial refresh and start polling every 60s
  refreshPortfolioPrices();
  setInterval(refreshPortfolioPrices, 60 * 1000);
});
