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
    console.error(`Erro ao conectar ao banco de dados no ambiente [${process.env.APP_ENV}]:`, err);
  } else {
    // Extrai apenas o host (ex: ep-delicate-night...) para logar sem expor a senha
    const host = dbConnectionString ? new URL(dbConnectionString).hostname : 'desconhecido';
    console.log(`✅ Conexão bem-sucedida! Ambiente: [${process.env.APP_ENV || 'padrão'}] | Banco: ${host}`);
  }
});

module.exports = pool;
