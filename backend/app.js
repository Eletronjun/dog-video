const express = require('express');

const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;
const webPush = require('web-push');
const bcrypt = require('bcryptjs'); 
const saltRounds = 10;

const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const authenticateToken = require('./middleware/auth');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
const dotenv = require('dotenv');
dotenv.config();

// Configuração do middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Conexão com o Banco de Dados
const pool = require('./config/db');

// Configuração das chaves VAPID
webPush.setVapidDetails(
  'mailto:232006663@aluno.unb.br',
  'BBH2oyhNjmKPnyR140S375tVHFM1wuSd7GW7ijm90Ja7NB2eX67YQRbDLVyW_QrLqiDpbIy9QecaBDC_K1AWCro', //chave pública gerada
  'Km-siZ1s_FTdpW594744qMlXuDgan3ve77AAAAWGTcU' //chave privada gerada
);


app.use('/', require('./routes/subscriptionRoutes'));
app.use('/', require('./routes/passeadoresRoutes'));
const errorHandler = require('./middleware/errorHandler');

// Rotas de Autenticação
app.use('/', require('./routes/authRoutes'));

// Rotas de Clientes e Passeios
app.use('/', require('./routes/clientesRoutes'));
app.use('/', require('./routes/passeiosRoutes'));



app.use(errorHandler);

const startCronJobs = require('./jobs/cronJobs');

// Inicia o servidor apenas se o arquivo for executado diretamente
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    startCronJobs(); // Inicia os cron jobs apenas na execução principal (não nos testes)
  });
}

// Exporta o app e o pool de conexões
module.exports = { app, pool };