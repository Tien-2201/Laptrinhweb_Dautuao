document.querySelectorAll("table").forEach(table => {
    const headers = Array.from(table.querySelectorAll("thead th"))
                         .map(th => th.innerText.trim());

    table.querySelectorAll("tbody tr").forEach(row => {
        row.querySelectorAll("td").forEach((td, i) => {
            td.setAttribute("data-label", headers[i]);
        });
    });
});
