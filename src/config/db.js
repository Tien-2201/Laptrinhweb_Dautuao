
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Tien',
  database: process.env.DB_NAME || 'DauTuAo',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT, 10) || 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Kết nối database thất bại:', err);
    return;
  }
  if (connection) {
    connection.release();
  }
  console.log('Kết nối database thành công!');
});

module.exports = pool;
