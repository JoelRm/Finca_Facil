// config/db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || 'joelrm',
  // si no hay password, lo dejamos undefined
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || 'fincafacildb',
});

module.exports = pool;
