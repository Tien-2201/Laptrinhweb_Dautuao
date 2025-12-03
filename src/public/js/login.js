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

function handleRegister(event) {
    event.preventDefault();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        showToast('Mật khẩu không khớp!', 'warn');
        return;
    }
    // Form submission handled by backend
}