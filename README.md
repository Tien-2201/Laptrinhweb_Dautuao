# Crypto Trading Application 🚀

A Node.js + Express cryptocurrency portfolio management & trading simulation web app with MySQL database backend.

## Features ✨

- **User Authentication**: Register, login, and secure session management
- **Market Data**: Real-time crypto prices from CoinGecko API with caching
- **Trading**: Buy/sell cryptocurrencies with balance tracking
- **Portfolio**: View holdings, profit/loss calculations using FIFO method
- **Transaction History**: Complete audit trail of all trades
- **Responsive Design**: Mobile-optimized UI with 700px breakpoint
- **Toast Notifications**: User-friendly notifications with FontAwesome icons
- **Database-Driven**: MySQL for coins, users, wallets, and transactions

## Tech Stack

- **Runtime**: Node.js v18+
- **Framework**: Express 5.x + Express-Handlebars (SSR)
- **Database**: MySQL via mysql2 connection pool
- **Styling**: SCSS (compiled to CSS) + Bootstrap 5 CDN
- **Icons**: FontAwesome 6.7.2 CDN
- **Authentication**: bcryptjs password hashing + express-session

## Prerequisites

- **Node.js**: v18 or higher
- **MySQL**: Running server with database created
- **npm**: v9 or higher

## Installation

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Tien-2201/nodejs_project.git
cd nodejs_project
npm install
```

### 2. Configure Database

Create a MySQL database and import the schema:

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

### 3. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

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

## Running the Application

### Development Mode (with auto-reload)

```bash
npm start
```

Server runs on `http://localhost:3000` by default.

### Watch SCSS for changes

In a separate terminal:

```bash
npm run watch
```

This compiles SCSS to CSS automatically on file changes.

## Project Structure

```
src/
├── index.js                 # Express app initialization
├── config/
│   └── db.js               # MySQL connection pool
├── middleware/
│   └── auth.js             # Authentication middleware
├── routes/
│   ├── index.js            # Route aggregator
│   ├── home.js             # Home page
│   ├── login.js            # Auth routes
│   ├── market.js           # Market page + /coins API
│   ├── portfolio.js        # Portfolio page
│   ├── trading.js          # Trading page
│   ├── history.js          # Transaction history
│   ├── profile.js          # User profile
│   └── tradingApi.js       # REST API (/api/trading/*)
├── app/
│   └── controllers/        # Page controllers
├── services/
│   └── marketService.js    # CoinGecko price fetching + caching
├── middleware/
│   └── auth.js            # ensureAuth middleware
├── public/
│   ├── js/                # Client-side scripts
│   └── css/               # Compiled CSS from SCSS
└── resources/
    ├── scss/              # SCSS source
    └── views/             # Handlebars templates
```

## API Endpoints

### Trading API

- **GET** `/api/trading/price?coin=bitcoin` - Get current price
- **GET** `/api/trading/ohlc?coin=bitcoin&days=1` - Get OHLC data
- **POST** `/api/trading/buy` - Execute buy trade
- **POST** `/api/trading/sell` - Execute sell trade
- **GET** `/api/trading/portfolio` - Get user holdings

### Market API

- **GET** `/market/data` - Get cached market data (with staleness info)
- **GET** `/market/coins` - Get list of active coins for trading select

## Features in Detail

### Authentication

- Users register with username/email and password
- Passwords hashed with bcryptjs before storage
- Session stored in-memory (production should use redis)
- Session includes user ID and balance, excludes password hash

### Market Data

- MarketService fetches prices from CoinGecko every 60 seconds
- Uses exponential backoff on rate limits (up to 30 minutes)
- Caches last successful response
- Returns staleness info to client

### Trading

- Buy/sell validation includes:
  - Sufficient USD balance for buys
  - Sufficient coin holdings for sells
  - Valid amount/price (positive numbers)
- Uses database transactions (BEGIN/COMMIT/ROLLBACK) for atomicity
- Locks wallet balance with `SELECT...FOR UPDATE` to prevent race conditions

### Portfolio

- FIFO method: matches oldest buy with newest sell
- Calculates average cost, current market value, and P&L
- Color-coded: green for profit (+), red for loss (-)
- Displays as percentage and dollar amount

### Responsive Design

- Single breakpoint at 700px (mobile threshold)
- Mobile tables use CSS `::before` pseudo-elements with `data-label` attributes
- All components tested and optimized for mobile

## Security Notes

⚠️ **Development Only**: This app uses in-memory session storage. For production:
- Use a dedicated session store (redis, memcached)
- Set `NODE_ENV=production` and use strong `SESSION_SECRET`
- Enable HTTPS
- Review helmet CSP settings (currently allows CDN sources)
- Add rate limiting to API endpoints
- Validate all user input server-side

## Troubleshooting

### Port 3000 in use?

```bash
# Change in .env
PORT=3001
```

### Database connection error?

Check `.env` credentials match your MySQL setup:

```bash
mysql -h 127.0.0.1 -u root -p
# Enter your password, then:
# USE DauTuAo;
# SELECT * FROM coins;
```

### SASS compilation error?

Ensure SASS is installed:

```bash
npm install -D sass@latest
npm run watch
```

## Development Tips

- Use `npm start` to run with nodemon and auto-reload
- Check `src/index.js` for middleware and error handling setup
- Add new pages: create route file → create controller → add template
- CSS changes: edit `src/resources/scss/app.scss` → saved SCSS auto-compiles to `src/public/css/app.css`

## License

ISC - See LICENSE file for details

## Author

@Tien-2201
