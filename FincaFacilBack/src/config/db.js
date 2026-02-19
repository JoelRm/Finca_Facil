const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host: env.PGHOST,
  port: env.PGPORT,
  user: env.PGUSER,
  password: env.PGPASSWORD,
  database: env.PGDATABASE,
  ssl: env.PGSSL ? { rejectUnauthorized: false } : false,
});

module.exports = pool;
