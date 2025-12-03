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
