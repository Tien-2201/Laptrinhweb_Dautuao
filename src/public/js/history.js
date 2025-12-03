// History Card Pagination (Client-side)
const HISTORY_CARDS_PER_PAGE = 4;
let historyCurrentPage = 1;
let historyTotalPages = 1;
let historyAllCards = [];

document.addEventListener('DOMContentLoaded', () => {
  // Initialize card pagination
  const cardGrid = document.querySelector('.history-cards-grid');
  if (cardGrid) {
    historyAllCards = Array.from(cardGrid.querySelectorAll('.history-card'));
    historyTotalPages = Math.ceil(historyAllCards.length / HISTORY_CARDS_PER_PAGE);

    if (historyAllCards.length > HISTORY_CARDS_PER_PAGE) {
      showHistoryPage(1);
    } else {
      // Hide pagination if only 1 page
      const pagination = document.querySelector('.history-pagination');
      if (pagination) pagination.style.display = 'none';
    }

    // Bind pagination buttons
    const prevBtn = document.querySelector('.history-prev');
    const nextBtn = document.querySelector('.history-next');
    if (prevBtn) prevBtn.addEventListener('click', () => showHistoryPage(historyCurrentPage - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showHistoryPage(historyCurrentPage + 1));
  }

  // Initialize filter functionality (for both table and cards)
  const filterButtons = document.querySelectorAll('.history-filter-btn');
  const tableRows = document.querySelectorAll('#historyTableBody tr[data-type]');
  const allCards = document.querySelectorAll('.history-card[data-type]');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      // Filter table rows
      tableRows.forEach(row => {
        const type = row.getAttribute('data-type')?.toLowerCase();
        if (filter === 'all' || type === filter) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });

      // Hide all cards first, then filter
      allCards.forEach(card => card.style.display = 'none');
      
      // Filter cards and update pagination
      historyAllCards = Array.from(allCards).filter(card => {
        const type = card.getAttribute('data-type')?.toLowerCase();
        return filter === 'all' || type === filter;
      });

      // Reset to page 1 and recalculate total pages
      historyCurrentPage = 1;
      historyTotalPages = Math.ceil(historyAllCards.length / HISTORY_CARDS_PER_PAGE);
      
      // Show first page of filtered results
      if (historyAllCards.length > 0) {
        showHistoryPage(1);
        
        // Show pagination if needed
        const pagination = document.querySelector('.history-pagination');
        if (pagination) {
          pagination.style.display = historyAllCards.length > HISTORY_CARDS_PER_PAGE ? 'flex' : 'none';
        }
      } else {
        // Hide pagination if no results
        const pagination = document.querySelector('.history-pagination');
        if (pagination) pagination.style.display = 'none';
      }
    });
  });
});

function showHistoryPage(pageNum) {
  if (pageNum < 1 || pageNum > historyTotalPages) return;

  historyCurrentPage = pageNum;

  // Hide all cards
  historyAllCards.forEach(card => card.style.display = 'none');

  // Show cards for current page
  const start = (pageNum - 1) * HISTORY_CARDS_PER_PAGE;
  const end = start + HISTORY_CARDS_PER_PAGE;
  for (let i = start; i < end && i < historyAllCards.length; i++) {
    historyAllCards[i].style.display = 'block';
  }

  // Update pagination info
  const pageCurrentEl = document.querySelector('.history-pagination .page-current');
  const pageTotalEl = document.querySelector('.history-pagination .page-total');
  if (pageCurrentEl) pageCurrentEl.textContent = historyCurrentPage;
  if (pageTotalEl) pageTotalEl.textContent = historyTotalPages;

  // Update button visibility
  const prevBtn = document.querySelector('.history-prev');
  const nextBtn = document.querySelector('.history-next');
  if (prevBtn) prevBtn.style.display = pageNum > 1 ? 'block' : 'none';
  if (nextBtn) nextBtn.style.display = pageNum < historyTotalPages ? 'block' : 'none';

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
