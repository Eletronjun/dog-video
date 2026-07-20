const { Pool } = require('pg');
require('dotenv').config();

let dbConnectionString = process.env.DATABASE_URL;

if (process.env.APP_ENV === 'prod') {
  dbConnectionString = process.env.DATABASE_URL_PROD || dbConnectionString;
} else if (process.env.APP_ENV === 'dev') {
  dbConnectionString = process.env.DATABASE_URL_DEV || dbConnectionString;
} else if (process.env.APP_ENV === 'hom') {
  dbConnectionString = process.env.DATABASE_URL_HOM || dbConnectionString;
}

const pool = new Pool({
  connectionString: dbConnectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('Conexão bem-sucedida com PostgreSQL. Hora atual:', res.rows[0].now);
  }
});

module.exports = pool;
