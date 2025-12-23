# Ứng dụng Giao dịch Crypto 🚀

Một ứng dụng web mô phỏng giao dịch và quản lý danh mục tiền điện tử được xây dựng bằng Node.js + Express, sử dụng MySQL làm backend.

## Tính năng ✨

- **Xác thực người dùng**: Đăng ký, đăng nhập và quản lý phiên làm việc an toàn
- **Dữ liệu thị trường**: Giá tiền điện tử theo thời gian thực từ API CoinGecko với cơ chế cache
- **Giao dịch**: Mua/bán tiền điện tử với theo dõi số dư
- **Danh mục (Portfolio)**: Xem tài sản, tính lãi/lỗ theo phương pháp FIFO
- **Lịch sử giao dịch**: Ghi lại toàn bộ lịch sử giao dịch
- **Giao diện đáp ứng (Responsive)**: Tối ưu cho thiết bị di động với breakpoint 700px
- **Thông báo (Toast)**: Thông báo thân thiện người dùng sử dụng icon từ FontAwesome
- **Dựa trên CSDL**: MySQL lưu coins, users, wallets, transactions

## Ngăn xếp công nghệ

- **Runtime**: Node.js v18+
- **Framework**: Express 5.x + Express-Handlebars (SSR)
- **Cơ sở dữ liệu**: MySQL (mysql2 connection pool)
- **Giao diện**: SCSS (biên dịch sang CSS) + Bootstrap 5 CDN
- **Icon**: FontAwesome 6.7.2 CDN
- **Xác thực**: bcryptjs (băm mật khẩu) + express-session

## Yêu cầu trước khi cài đặt

- **Node.js**: phiên bản 18 trở lên
- **MySQL**: Server đang chạy và có thể tạo database
- **npm**: phiên bản 9 trở lên

## Cài đặt

### 1. Clone & cài đặt phụ thuộc

```bash
git clone https://github.com/Tien-2201/nodejs_project.git
cd nodejs_project
npm install
```

### 2. Cấu hình CSDL

Tạo database MySQL và import schema:

```sql
CREATE DATABASE DauTuAo;
USE DauTuAo;

-- Create coins table
CREATE TABLE coins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coin_id VARCHAR(50) UNIQUE NOT NULL,
    symbol VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active TINYINT DEFAULT 1,
    display_order INT DEFAULT 0
);

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create wallets table
CREATE TABLE wallets (
    user_id INT PRIMARY KEY,
    balance DECIMAL(15, 2) DEFAULT 100000.00,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create transactions table
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    coin_id INT NOT NULL,
    type ENUM('buy', 'sell') NOT NULL,
    amount DECIMAL(18, 8) NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (coin_id) REFERENCES coins(id) ON DELETE CASCADE
);

-- Insert sample coins
INSERT INTO coins (coin_id, symbol, name, is_active, display_order) VALUES
('bitcoin', 'BTC', 'Bitcoin', 1, 1),
('ethereum', 'ETH', 'Ethereum', 1, 2),
('cardano', 'ADA', 'Cardano', 1, 3),
('solana', 'SOL', 'Solana', 1, 4);
```

### 3. Cấu hình môi trường

Sao chép file `.env.example` rồi cấu hình:

```bash
cp .env.example .env
```

Chỉnh các biến môi trường trong `.env` cho phù hợp:

```dotenv
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=DauTuAo
DB_CONN_LIMIT=10
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_secure_random_string_here
```

## Chạy ứng dụng

### Chế độ phát triển (auto-reload)

```bash
npm start
```

Server chạy trên `http://localhost:3000` theo mặc định.

### Watch SCSS (tự biên dịch khi đổi file)

Mở terminal khác và chạy:

```bash
npm run watch
```

SCSS sẽ tự biên dịch sang CSS khi có thay đổi file.

## Cấu trúc dự án

```
src/
├── index.js                 # Khởi tạo ứng dụng Express
├── config/
│   └── db.js               # Pool kết nối MySQL
├── middleware/
│   └── auth.js             # Middleware xác thực
├── routes/
│   ├── index.js            # Tập hợp routes
│   ├── home.js             # Trang chủ
│   ├── login.js            # Route đăng nhập
│   ├── market.js           # Trang thị trường + API /coins
│   ├── portfolio.js        # Trang danh mục
│   ├── trading.js          # Trang giao dịch
│   ├── history.js          # Lịch sử giao dịch
│   ├── profile.js          # Hồ sơ người dùng
│   └── tradingApi.js       # REST API (/api/trading/*)
├── app/
│   └── controllers/        # Controllers xử lý trang
├── services/
│   └── marketService.js    # Lấy giá từ CoinGecko + cache
├── middleware/
│   └── auth.js            # ensureAuth middleware
├── public/
│   ├── js/                # Scripts phía client
│   └── css/               # CSS biên dịch từ SCSS
└── resources/
    ├── scss/              # Source SCSS
    └── views/             # Templates Handlebars
```

## API Endpoints

### Trading API

- **GET** `/api/trading/price?coin=bitcoin` - Lấy giá hiện tại
- **GET** `/api/trading/ohlc?coin=bitcoin&days=1` - Lấy dữ liệu OHLC
- **POST** `/api/trading/buy` - Thực hiện lệnh mua
- **POST** `/api/trading/sell` - Thực hiện lệnh bán
- **GET** `/api/trading/portfolio` - Lấy danh mục người dùng

### Market API

- **GET** `/market/data` - Lấy dữ liệu thị trường có cache (kèm thông tin cũ/mới)
- **GET** `/market/coins` - Lấy danh sách coins đang hoạt động

## Chi tiết tính năng

### Xác thực

- Người dùng đăng ký bằng username/email và mật khẩu
- Mật khẩu được băm bằng bcryptjs trước khi lưu
- Phiên (session) lưu trong bộ nhớ (production nên dùng redis)
- Phiên chứa user ID và balance; không lưu hash mật khẩu

### Dữ liệu thị trường

- MarketService lấy giá từ CoinGecko mỗi 60 giây
- Sử dụng exponential backoff khi bị rate limit (tối đa 30 phút)
- Cache phản hồi thành công gần nhất
- Trả thông tin cũ/mới cho client

### Giao dịch

- Kiểm tra hợp lệ khi mua/bán gồm:
  - Đủ số dư USD để mua
  - Đủ số coin để bán
  - Giá và số lượng là số dương
- Dùng transaction (BEGIN/COMMIT/ROLLBACK) để đảm bảo nguyên tử
- Khóa wallet bằng `SELECT...FOR UPDATE` để tránh race condition

### Danh mục (Portfolio)

- Dùng phương pháp FIFO: khớp lệnh mua cũ nhất với lệnh bán
- Tính giá vốn trung bình, giá thị trường hiện tại, và P&L
- Mã màu: xanh cho lời (+), đỏ cho lỗ (-)
- Hiển thị cả phần trăm và số tiền

### Giao diện đáp ứng

- Breakpoint đơn tại 700px (ngưỡng mobile)
- Bảng trên mobile dùng `data-label` + `::before` để dễ đọc
- Các component đã được kiểm thử và tối ưu cho mobile

## Ghi chú bảo mật

⚠️ **Chỉ dành cho phát triển**: Ứng dụng hiện lưu session trong bộ nhớ. Khi deploy production:
- Dùng session store chuyên dụng (redis, memcached)
- Thiết lập `NODE_ENV=production` và dùng `SESSION_SECRET` mạnh
- Bật HTTPS
- Rà soát lại CSP của helmet (hiện cho phép CDN)
- Thêm rate limiting cho API
- Validate đầu vào phía server

## Khắc phục sự cố

### Port 3000 đang dùng?

```bash
# Thay đổi trong .env
PORT=3001
```

### Lỗi kết nối CSDL?

Kiểm tra credentials trong `.env` khớp với MySQL của bạn:

```bash
mysql -h 127.0.0.1 -u root -p
# Nhập mật khẩu, sau đó:
# USE DauTuAo;
# SELECT * FROM coins;
```

### Lỗi biên dịch SASS?

Đảm bảo đã cài SASS:

```bash
npm install -D sass@latest
npm run watch
```

## Mẹo phát triển

- Dùng `npm start` để chạy với nodemon (auto-reload)
- Xem `src/index.js` để biết middleware và cấu hình xử lý lỗi
- Thêm trang mới: tạo route → controller → template
- Thay đổi CSS: chỉnh `src/resources/scss/app.scss` → SCSS sẽ tự biên dịch sang `src/public/css/app.css`

## Giấy phép

ISC - Xem file LICENSE để biết chi tiết

## Tác giả

@Tien-2201
