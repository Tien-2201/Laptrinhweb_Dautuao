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
    alert('Đăng nhập thành công!');
}

function handleRegister(event) {
    event.preventDefault();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert('Mật khẩu không khớp!');
        return;
    }

    alert('Đăng ký thành công!');
}