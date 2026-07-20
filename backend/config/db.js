const { Pool } = require('pg');
require('dotenv').config();

let dbConnectionString = process.env.DATABASE_URL;

if (process.env.APP_ENV === 'production') {
  dbConnectionString = process.env.DATABASE_URL_PRODUCTION || dbConnectionString;
} else if (process.env.APP_ENV === 'development') {
  dbConnectionString = process.env.DATABASE_URL_DEVELOPMENT || dbConnectionString;
} else if (process.env.APP_ENV === 'import') {
  dbConnectionString = process.env.DATABASE_URL_IMPORT || dbConnectionString;
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
