const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const pg = require('pg');
const dotenv = require('dotenv');

// --- CONFIGURAÇÃO DO CAMINHO DO .ENV  ---
const envPath = path.resolve(__dirname, '../.env'); 
dotenv.config({ path: envPath });

const { Pool } = pg;

// --- CONFIGURAÇÕES ---
const TOKENS_DIR = path.join(__dirname, 'tokens/'); // Usar path.join para criar o caminho
const INTERVALO = 60_000;

// --- CONEXÃO COM O BANCO DE DADOS ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Carrega client_id e client_secret a partir das variáveis de ambiente
const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;

async function autenticarComToken(tokenFile) {
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, 'urn:ietf:wg:oauth:2.0:oob');
  const token = JSON.parse(fs.readFileSync(tokenFile));
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

// Esta função verifica se a incorporação está ativa e a corrige se necessário
async function garantirIncorporacao(auth, broadcastId) {
  const youtube = google.youtube({ version: 'v3', auth });

  try {
    const res = await youtube.liveBroadcasts.list({
      part: ['id', 'status'],
      id: [broadcastId],
    });

    if (res.data.items.length === 0) return;
    const live = res.data.items[0];
    if (live.status.embeddable === true) return;

    //console.log(`🔧 Ativando incorporação para a live ID: ${broadcastId}...`);
    await youtube.liveBroadcasts.update({
      part: ['id', 'status'],
      requestBody: {
        id: broadcastId,
        status: { embeddable: true },
      },
    });
    //console.log(`✅ Incorporação ativada com sucesso para a live ID: ${broadcastId}.`);
  } catch (error) {
    //console.error(`❌ Erro ao tentar garantir a incorporação para a live ${broadcastId}:`, error.message);
  }
}


async function buscarLiveAtiva(auth, nomeCanal) {
  const youtube = google.youtube({ version: 'v3', auth });
  const res = await youtube.liveBroadcasts.list({
    part: ['id', 'snippet', 'status'],
    broadcastStatus: 'active',
  });

  const lives = res.data.items;
  if (!lives || lives.length === 0) return [];

  return lives.map(live => ({
    canal: nomeCanal,
    title: live.snippet.title,
    url: `https://www.youtube.com/watch?v=${live.id}`,
    youtube_id: live.id,
  }));
}

async function sincronizarLivesComBanco(livesAtivasDaAPI) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultadoBanco = await client.query('SELECT youtube_id FROM lives');
    const idsNoBanco = resultadoBanco.rows.map(row => row.youtube_id);
    const idsAtivosDaAPI = livesAtivasDaAPI.map(l => l.youtube_id);
    const idsParaDeletar = idsNoBanco.filter(id => !idsAtivosDaAPI.includes(id));

    if (idsParaDeletar.length > 0) {
      const deleteQuery = 'DELETE FROM lives WHERE youtube_id = ANY($1::text[])';
      await client.query(deleteQuery, [idsParaDeletar]);
      //console.log(`🗑️ ${idsParaDeletar.length} live(s) antigas removidas do banco.`);
    }

    let novasLivesInseridas = 0;
    for (const live of livesAtivasDaAPI) {
      if (!idsNoBanco.includes(live.youtube_id)) {
        const insertQuery = `
          INSERT INTO lives (canal, title, url, youtube_id, modulo) 
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(insertQuery, [live.canal, live.title, live.url, live.youtube_id, live.modulo]);
        novasLivesInseridas++;
      }
    }

    if (novasLivesInseridas > 0) {
     //console.log(`✨ ${novasLivesInseridas} nova(s) live(s) inseridas no banco.`);
    }

    await client.query('COMMIT');
    return livesAtivasDaAPI;
  } catch (error) {
    await client.query('ROLLBACK');
    //console.error('❌ Erro na transação com o banco de dados, rollback executado:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function monitorarLives() {
  const tokenFiles = fs.readdirSync(TOKENS_DIR)
    .filter(f => f.startsWith('token_') && f.endsWith('.json'));

  const todasLives = [];
  for (const file of tokenFiles) {
    const nomeCanal = path.basename(file, '.json').replace('token_', '');
    try {
      const match = nomeCanal.match(/Modulo DogVideo (\d+)/);
      if (!match) {
        //console.warn(`⚠️ O arquivo de token "${file}" não segue o padrão. Pulando.`);
        continue;
      }
      const modulo = parseInt(match[1], 10);
      const auth = await autenticarComToken(path.join(TOKENS_DIR, file));
      const lives = await buscarLiveAtiva(auth, nomeCanal);
      
      for(const live of lives) {
        await garantirIncorporacao(auth, live.youtube_id);
        live.modulo = modulo;
        todasLives.push(live);
      }
    } catch (err) {
      //console.error(`❌ Erro com ${file}:`, err.message);
    }
  }

  const salvas = await sincronizarLivesComBanco(todasLives);
  //console.log(`✅ ${salvas.length} live(s) ativa(s) detectadas e sincronizadas em ${new Date().toLocaleTimeString()}`);
  if(salvas.length > 0) {
    salvas.forEach(l => console.log(`🔗 Módulo ${l.modulo} (${l.canal}): ${l.title} → ${l.url}`));
  }
}

async function loop() {
  //console.log('📡 Monitorando lives (YouTube) para o banco de dados...');
  await monitorarLives();
  setInterval(monitorarLives, INTERVALO);
}

loop();