document.addEventListener('DOMContentLoaded', () => {
    const filterButtons = document.querySelectorAll('.history-filter-btn');
    const tableRows = document.querySelectorAll('#historyTableBody tr[data-type]');

    filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        // Update active button
        filterButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');

        // Filter rows
        tableRows.forEach(row => {
        const type = row.getAttribute('data-type');
        if (filter === 'all' || type === filter) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
        });
    });
    });
});