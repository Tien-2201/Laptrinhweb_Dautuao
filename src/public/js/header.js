
const mobileMenu = document.querySelector('.mobile-menu');
const nav = document.querySelector('nav');

mobileMenu.addEventListener('click', () => {
    nav.classList.toggle('active');
});

// Đóng menu khi click vào link
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            document.querySelector('nav').classList.remove('active');
        }
    });
});

// Đóng menu khi click ra ngoài
document.addEventListener('click', (e) => {
    const nav = document.querySelector('nav');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (window.innerWidth <= 768 && 
        !nav.contains(e.target) && 
        !mobileMenu.contains(e.target)) {
        nav.classList.remove('active');
    }
});