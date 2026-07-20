const fs = require('fs');
const path = require('path');
const http = require('http');
const open = require('open');
const { google } = require('googleapis');
const dotenv = require('dotenv');

// --- LÓGICA PARA CARREGAR VARIÁVEIS DE AMBIENTE ---
const envPath = path.resolve(__dirname, '../.env'); 
dotenv.config({ path: envPath });

// --- ESCOPO ATUALIZADO PARA PERMITIR EDIÇÃO ---
const SCOPES = ['https://www.googleapis.com/auth/youtube'];
const TOKEN_DIR = 'tokens/';
const TOKEN_NAME_PREFIX = 'token_';
const REDIRECT_URI = 'http://localhost:3000';

// Função para obter o cliente OAuth2 configurado
function getOAuthClient() {
  // --- BUSCANDO CHAVES DO .ENV ---
  const client_id = process.env.GOOGLE_CLIENT_ID;
  const client_secret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!client_id || !client_secret) {
    throw new Error('GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET precisam estar definidos no arquivo .env');
  }

  return new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);
}

// Função principal de autenticação
async function autenticar() {
  const oAuth2Client = getOAuthClient();

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });

  console.log('\n🔗 Abrindo o navegador para autenticação...');

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get('code');

      if (code) {
        res.end('<h1>Autenticação bem-sucedida!</h1><p>Você já pode fechar esta janela do navegador e voltar ao terminal.</p>');
        server.close();

        console.log('✅ Código recebido, obtendo tokens...');
        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        console.log('🔍 Buscando nome do canal para salvar o token...');
        const youtube = google.youtube({ version: 'v3', auth: oAuth2Client });
        const channelResponse = await youtube.channels.list({ part: ['snippet'], mine: true });
        
        const channel = channelResponse.data.items?.[0];
        // Mantendo o nome original do canal para consistência com o script de monitoramento
        const channelName = channel?.snippet?.title || 'canal_desconhecido';
        
        if (!fs.existsSync(TOKEN_DIR)) {
          fs.mkdirSync(TOKEN_DIR);
        }

        const tokenPath = path.join(TOKEN_DIR, `${TOKEN_NAME_PREFIX}${channelName}.json`);
        fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));

        console.log(`\n🔑 Token salvo com sucesso em: ${tokenPath}`);
        
        console.log('✅ Processo finalizado.');
        process.exit(0);

      }
    } catch (err) {
      console.error('❌ Erro ao processar o código:', err.message);
      process.exit(1);
    }
  }).listen(3000, () => {
    open(authUrl);
  });
}

autenticar().catch(err => {
    console.error('❌ Erro durante a autenticação:', err.message);
    process.exit(1);
});