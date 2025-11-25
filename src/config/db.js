
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'Tien',
  database: 'DauTuAo'
});

connection.connect((err) => {
  if (err) {
    console.error('Kết nối database thất bại:', err);
    return;
  }
  console.log('Kết nối database thành công!');
});

module.exports = connection;
