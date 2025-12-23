function switchForm(formType) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (formType === 'login') {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
}

function handleLogin(event) {
    event.preventDefault();
    // Form submission handled by backend
}

async function handleRegister(event) {
    event.preventDefault();
    const emailInput = document.querySelector('input[name="email"]');
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!emailInput) {
        showToast('Không tìm thấy trường email.', 'error');
        return;
    }

    const email = emailInput.value.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
        showToast('Định dạng email không hợp lệ.', 'warn');
        return;
    }

    // Check availability before submitting
    try {
        const resp = await fetch(`/login/check-email?email=${encodeURIComponent(email)}`);
        const data = await resp.json();
        if (!data.available) {
            showToast(data.message || 'Email đã được đăng ký.', 'warn');
            return;
        }
    } catch (e) {
        // non-blocking: allow submit but inform the user
        console.warn('Lỗi khi kiểm tra email:', e);
    }

    if (password !== confirmPassword) {
        showToast('Mật khẩu không khớp!', 'warn');
        return;
    }

    // Submit the form if validation passes
    const form = document.querySelector('#registerForm form');
    if (form) form.submit();
}

// Attach async blur handler to check email on input blur for early feedback
document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.querySelector('input[name="email"]');
    if (!emailInput) return;

    let pending = null;
    emailInput.addEventListener('blur', () => {
        const email = emailInput.value.trim();
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRe.test(email)) return;
        // small debounce to avoid rapid calls
        if (pending) clearTimeout(pending);
        pending = setTimeout(async () => {
            try {
                const resp = await fetch(`/login/check-email?email=${encodeURIComponent(email)}`);
                const data = await resp.json();
                if (!data.available) showToast(data.message || 'Email đã được đăng ký.', 'warn');
            } catch (e) {
                // ignore network errors for blur check
            }
        }, 250);
    });
});