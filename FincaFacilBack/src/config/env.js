require('dotenv').config();

module.exports = {
  PORT: Number(process.env.PORT) || 3000,

  PGHOST: process.env.PGHOST || 'localhost',
  PGPORT: Number(process.env.PGPORT) || 5432,
  PGUSER: process.env.PGUSER || 'joelrm',
  PGPASSWORD: process.env.PGPASSWORD || undefined,
  PGDATABASE: process.env.PGDATABASE || 'fincafacildb',

  PGSSL: (process.env.PGSSL || 'true').toLowerCase() === 'true',
};
