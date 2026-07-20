// Para rodar execute o seguinte comando: 'docker-compose exec app node backend/scripts/reset_admin.js'
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../../.env' });

async function resetForEnv(envName, url) {
  if (!url) {
    console.log(`⏭️ Pulo: ${envName} não tem URL configurada no .env.`);
    return;
  }
  
  const pool = new Pool({ 
    connectionString: url, 
    ssl: { rejectUnauthorized: false } 
  });

  try {
    const hash = await bcrypt.hash('admin123', 10);
    const res = await pool.query('UPDATE clientes SET senha = $1 WHERE email = $2 RETURNING email', [hash, 'admin@gmail.com']);
    
    if (res.rows.length > 0) {
      console.log(`✅ [${envName}] Senha do admin (${res.rows[0].email}) redefinida para admin123!`);
    } else {
      console.log(`❌ [${envName}] Usuário admin@gmail.com não encontrado!`);
    }
  } catch (err) {
    console.error(`❌ Erro no ambiente [${envName}]:`, err.message);
  } finally {
    await pool.end();
  }
}

async function run() {
  console.log('Iniciando sincronização de senhas...');
  await resetForEnv('DEV', process.env.DATABASE_URL_DEV);
  await resetForEnv('HOM', process.env.DATABASE_URL_HOM);
  await resetForEnv('PROD', process.env.DATABASE_URL_PROD);
  console.log('Finalizado!');
}

run();
