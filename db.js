const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_db',
  waitForConnections: true,
  connectionLimit: 10,
  // TiDB Cloud (and most cloud MySQL) requires a TLS connection.
  // Set DB_SSL=true in your environment variables when connecting to TiDB Cloud.
  ssl: process.env.DB_SSL === 'true' ? { minVersion: 'TLSv1.2' } : undefined,
});

const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.log('Database connection FAILED ❌:', err.message);
  } else {
    console.log('Database connected successfully! 🔌✅');
    connection.release();
  }
});

module.exports = promisePool;