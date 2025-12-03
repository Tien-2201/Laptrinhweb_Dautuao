
const db = require('../../config/db');
const bcrypt = require('bcryptjs');

class LoginCTL {

    showLogin(req, res) {
        res.render('login', {layout: 'login'});
    }

    login(req, res) {
        const { email, password } = req.body;



        // Lấy user theo email, sau đó so sánh password bằng bcrypt
        const sql = 'SELECT * FROM users WHERE email = ?';

        db.query(sql, [email], (err, results) => {
            if (err) {
                console.error('[LoginCTL] Lỗi khi truy vấn DB:', err);
                return res.render('login', { layout: 'login', error: 'Lỗi server, vui lòng thử lại sau.' });
            }

            if (!results || results.length === 0) {
                return res.render('login', { layout: 'login', error: 'Sai tài khoản hoặc mật khẩu!' });
            }

            const user = results[0];

            // so sánh mật khẩu nhập với mật khẩu băm trong DB
            bcrypt.compare(password, user.password, (bcryptErr, same) => {
                if (bcryptErr) {
                    console.error('[LoginCTL] Lỗi bcrypt:', bcryptErr);
                    return res.render('login', { layout: 'login', error: 'Lỗi server, vui lòng thử lại sau.' });
                }

                if (same) {
                    // Không lưu mật khẩu (hash) vào session
                    const safeUser = { ...user };
                    if (safeUser.password) delete safeUser.password;
                    req.session.user = safeUser;
                    // Initialize in-session USD balance if not present (default 10000)
                    if (!req.session.balance && req.session.balance !== 0) {
                        req.session.balance = 10000;
                    }

                    return res.redirect('/home');
                }

                return res.render('login',{ layout: 'login', error: 'Sai tài khoản hoặc mật khẩu!' });
            });
        });
    }

    register(req, res) {
        const { fullname, email, password, confirmPassword } = req.body;



        if (!fullname || !email || !password || !confirmPassword) {
            return res.render('login', { layout: 'login', error: 'Vui lòng điền đầy đủ thông tin đăng ký.' });
        }

        if (password !== confirmPassword) {
            return res.render('login', { layout: 'login', error: 'Mật khẩu và xác nhận mật khẩu không khớp.' });
        }

        // Kiểm tra email đã tồn tại chưa
        db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
            if (err) {
                console.error('[LoginCTL.register] Lỗi DB:', err);
                return res.render('login', { layout: 'login', error: 'Lỗi server, vui lòng thử lại sau.' });
            }

            if (results && results.length > 0) {
                return res.render('login', { layout: 'login', error: 'Email đã được đăng ký.' });
            }

            // Băm mật khẩu rồi insert user mới
            bcrypt.hash(password, 10, (hashErr, hash) => {
                if (hashErr) {
                    console.error('[LoginCTL.register] Lỗi băm:', hashErr);
                    return res.render('login', { layout: 'login', error: 'Lỗi server, vui lòng thử lại sau.' });
                }

                const sql = 'INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)';
                db.query(sql, [fullname, email, hash], (insErr, insRes) => {
                    if (insErr) {
                        console.error('[LoginCTL.register] Lỗi insert:', insErr);
                        return res.render('login', { layout: 'login', error: 'Lỗi server, vui lòng thử lại sau.' });
                    }


                    // Sau khi đăng ký thành công — tự động đăng nhập
                    db.query('SELECT * FROM users WHERE id = ?', [insRes.insertId], (qErr, rows) => {
                        if (qErr || !rows || rows.length === 0) {
                            return res.render('login', { layout: 'login',  error: 'Đăng ký thành công. Vui lòng đăng nhập.' });
                        }
                        // Không lưu mật khẩu băm vào session
                        const newUser = { ...rows[0] };
                        if (newUser.password) delete newUser.password;
                        req.session.user = newUser;
                        if (!req.session.balance && req.session.balance !== 0) {
                            req.session.balance = 10000;
                        }
                        return res.redirect('/home');
                    });
                });
            });
        });
    }

    logout(req, res) {
        req.session.destroy(err => {
            if (err) {
                console.error('[LoginCTL.logout] Lỗi khi huỷ session:', err);
            }
            res.redirect('/login');
        });
    }
}

module.exports = new LoginCTL();
