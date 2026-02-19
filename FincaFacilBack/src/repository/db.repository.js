const pool = require('../config/db');

exports.query = (text, params) => pool.query(text, params);

exports.tx = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await fn(client);
    await client.query('COMMIT');
    return res;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};
