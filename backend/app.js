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
const jwt = require('jsonwebtoken');
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

// Middleware para autenticar e extrair o ID do usuário logado
const authenticateAndExtractUser = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token não fornecido' });
  }

  const secret = process.env.JWT_SECRET || 'your_secret_key';
  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token inválido' });
    }
    req.user = user; // Adiciona os dados do usuário logado à requisição
    next();
  });
};



// Função para verificar conflitos de módulo

// Função para verificar conflitos de módulo ao editar passeador
const verificarConflitoModuloPasseador = async (modulo, modulo2, id_passeador) => {
  const query = `
    SELECT p.horario_passeio, pa.nome AS nome_passeador, pa.modulo, pa.modulo2
    FROM passeios p
    JOIN passeadores pa ON p.id_passeador = pa.id_passeador
    WHERE pa.id_passeador != $1 -- Ignora o passeador atual
    AND ($2 = pa.modulo OR $2 = pa.modulo2 OR $3 = pa.modulo OR $3 = pa.modulo2) -- Verifica conflitos nos módulos
  `;
  const result = await pool.query(query, [id_passeador, modulo, modulo2]);

  const horarios = result.rows.map(row => ({
    horario: dayjs(row.horario_passeio, 'HH:mm:ss'),
    nomePasseador: row.nome_passeador,
    modulo: row.modulo,
    modulo2: row.modulo2,
  }));

  // Busca o horário do passeador que está sendo editado
  const horarioPasseadorEditadoQuery = `
    SELECT p.horario_passeio
    FROM passeios p
    WHERE p.id_passeador = $1
    LIMIT 1
  `;
  const horarioPasseadorEditadoResult = await pool.query(horarioPasseadorEditadoQuery, [id_passeador]);

  if (horarioPasseadorEditadoResult.rows.length === 0) {
    return { conflito: false }; // Se o passeador não tem horário, não há conflito
  }

  const horarioPasseadorEditado = dayjs(horarioPasseadorEditadoResult.rows[0].horario_passeio, 'HH:mm:ss');

  for (const { horario, nomePasseador, modulo, modulo2 } of horarios) {
    const diferenca = Math.abs(horarioPasseadorEditado.diff(horario, 'minute')); // Calcula a diferença entre os horários

    if (diferenca <= 60) { // Verifica se está dentro de 1 hora antes ou depois
      return {
        conflito: true,
        nomePasseador,
        modulo,
        modulo2,
      };
    }
  }

  return { conflito: false };
};

// Rota para salvar `subscriptions` no banco de dados
app.post('/subscribe', authenticateAndExtractUser, (req, res) => {
  const { subscription } = req.body;
  const id_cliente = req.user.userType === 'user' ? req.user.id : null;

  if (!id_cliente) {
    return res.status(400).json({ success: false, message: 'ID do cliente não fornecido' });
  }

  saveSubscription(subscription, id_cliente)
    .then((message) => res.status(201).json({ success: true, message }))
    .catch((error) => res.status(500).json({ success: false, message: error }));
});

// Rota para criar e armazenar notificações
app.post('/notificacoes', (req, res) => {
  const { tipo, mensagem, id_cliente, id_passeador } = req.body;
  const query = `
    INSERT INTO notificacoes (tipo, mensagem, data_hora, id_cliente, id_passeador)
    VALUES ($1, $2, NOW(), $3, $4)
  `;
  const values = [tipo, mensagem, id_cliente || null, id_passeador || null];
  pool.query(query, values, (err, result) => {
    if (err) {
      console.error('Erro ao salvar notificação:', err);
      return res.status(500).json({ success: false, message: 'Erro ao salvar notificação' });
    }
    res.status(201).json({ success: true, message: 'Notificação criada com sucesso!' });
  });
});

// Rota para enviar notificações push manualmente (se necessário)
app.post('/send-notification', (req, res) => {
  const { id_notificacao } = req.body;
  const queryNotificacao = 'SELECT * FROM notificacoes WHERE id_notificacao = $1';
  pool.query(queryNotificacao, [id_notificacao], (err, notificacaoResult) => {
    if (err || notificacaoResult.rows.length === 0) {
      console.error('Erro ao buscar notificação:', err);
      return res.status(404).json({ success: false, message: 'Notificação não encontrada' });
    }
    const notificacao = notificacaoResult.rows[0];
    const payload = JSON.stringify({ title: notificacao.tipo, body: notificacao.mensagem });
    const querySubscriptions = `
      SELECT * FROM subscriptions 
      WHERE (id_cliente = $1 OR id_passeador = $2) 
      OR (id_cliente IS NULL AND id_passeador IS NULL)
    `;
    pool.query(querySubscriptions, [notificacao.id_cliente, notificacao.id_passeador], (err, subscriptions) => {
      if (err) {
        console.error('Erro ao buscar subscriptions:', err);
        return res.status(500).json({ success: false, message: 'Erro ao buscar subscriptions' });
      }
      subscriptions.rows.forEach((sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        webPush.sendNotification(pushSubscription, payload).catch((error) => {
          console.error('Erro ao enviar notificação push:', error);
        });
      });
      res.status(200).json({ success: true, message: 'Notificações enviadas com sucesso!' });
    });
  });
});



// Rotas de Autenticação
app.use('/', require('./routes/authRoutes'));

// Rotas de Clientes e Passeios
app.use('/', require('./routes/clientesRoutes'));
app.use('/', require('./routes/passeiosRoutes'));

// Endpoint para buscar passeadores com imagens ou informações detalhadas de um passeador específico
app.get('/passeadores/:id?', (req, res) => {
  const passeadorId = req.params.id; // ID opcional

  if (passeadorId) {
    // Caso o ID seja fornecido, busca detalhes do passeador e seus clientes associados
    const queryPasseador = `
      SELECT nome, email, imagem, cpf, telefone, endereco, modulo, modulo2 
      FROM passeadores 
      WHERE id_passeador = $1`;

    const queryClientes = `
      SELECT DISTINCT clientes.nome 
      FROM clientes
      JOIN cachorros ON cachorros.id_cliente = clientes.id_cliente
      WHERE cachorros.id_passeador = $1`;

    pool.query(queryPasseador, [passeadorId], (err, passeadorResults) => {
      if (err) {
        console.error('Erro ao consultar passeador:', err);
        return res.status(500).send('Erro ao consultar passeador');
      }

      if (passeadorResults.rows.length === 0) {
        return res.status(404).send('Passeador não encontrado');
      }

      const passeador = passeadorResults.rows[0];

      if (passeador.imagem) {
        passeador.imagem = `data:image/jpeg;base64,${passeador.imagem.toString('base64')}`;
      }

      // Consultar todos os clientes associados ao passeador
      pool.query(queryClientes, [passeadorId], (err, clienteResults) => {
        if (err) {
          console.error('Erro ao consultar clientes:', err);
          return res.status(500).send('Erro ao consultar clientes');
        }

        // Combina os nomes dos clientes em uma única string separada por vírgulas
        const clientes = clienteResults.rows.map(cliente => cliente.nome).join(', ');

        res.json({ success: true, passeador, clientes });
      });
    });
  } else {
    // Caso o ID não seja fornecido, busca todos os passeadores com imagens
    const queryTodosPasseadores = `
      SELECT id_passeador, nome, imagem
      FROM passeadores`;

    pool.query(queryTodosPasseadores, (err, results) => {
      if (err) {
        console.error('Erro ao consultar passeadores:', err);
        return res.status(500).json({ success: false, message: 'Erro ao consultar passeadores' });
      }

      // Formata os resultados
      const passeadores = results.rows.map(passeador => ({
        id: passeador.id_passeador,
        nome: passeador.nome,
        imagem: passeador.imagem ? `data:image/jpeg;base64,${passeador.imagem.toString('base64')}` : null
      }));

      res.json({ success: true, passeadores });
    });
  }
});

// Endpoint para atualizar os dados de um passeador
app.put('/passeadores/:id', async (req, res) => {
  const passeadorId = req.params.id;
  const { nome, email, cpf, telefone, endereco, imagem, modulo, modulo2 } = req.body;

  try {
    // Verifica conflitos de módulo
    const conflito = await verificarConflitoModuloPasseador(modulo, modulo2, passeadorId);

    if (conflito.conflito) {
      return res.status(400).json({
        success: false,
        message: `Conflito de módulo detectado. O passeador ${conflito.nomePasseador} está usando o módulo ${conflito.modulo} e ${conflito.modulo2} em um horário próximo.`,
      });
    }

    // Conversão de base64 para Blob (Binário)
    const imagemBlob = imagem ? Buffer.from(imagem.replace(/^data:image\/\w+;base64,/, ""), 'base64') : null;

    const query = `
      UPDATE passeadores
      SET nome = $1, email = $2, cpf = $3, telefone = $4, endereco = $5, imagem = $6, modulo = $7, modulo2 = $8
      WHERE id_passeador = $9
    `;

    await pool.query(query, [nome, email, cpf, telefone, endereco, imagemBlob, modulo, modulo2, passeadorId]);

    res.json({ success: true, message: 'Passeador atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao atualizar passeador:', err);
    res.status(500).json({ success: false, message: 'Erro ao atualizar passeador' });
  }
});

// Endpoint para criar um novo passeador
app.post('/criarpasseador', (req, res) => {
  const { nome, email, cpf, telefone, endereco, imagem, modulo, modulo2 } = req.body; // inclua modulo2

  // Converte a imagem base64 em Blob para salvar no banco de dados
  const imagemBlob = imagem ? Buffer.from(imagem.replace(/^data:image\/\w+;base64,/, ""), 'base64') : null;

  const query = `
    INSERT INTO passeadores (nome, email, cpf, telefone, endereco, imagem, modulo, modulo2)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id_passeador
  `;

  pool.query(query, [nome, email, cpf, telefone, endereco, imagemBlob, modulo, modulo2], (err, result) => {
    if (err) {
      console.error('Erro ao criar passeador:', err);
      return res.status(500).json({ success: false, message: 'Erro ao criar passeador' });
    }
    const novoPasseadorId = result.rows[0].id_passeador;
    res.json({ success: true, message: 'Passeador criado com sucesso!', id_passeador: novoPasseadorId });
  });
});

// Endpoint para excluir um passeador pelo ID
app.delete('/passeadores/:id', (req, res) => {
  const passeadorId = req.params.id;

  // Atualizar ou excluir cachorros associados ao passeador
  const updateCachorrosQuery = 'UPDATE cachorros SET id_passeador = NULL WHERE id_passeador = $1';
  pool.query(updateCachorrosQuery, [passeadorId], (err) => {
    if (err) {
      console.error('Erro ao atualizar cachorros associados ao passeador:', err);
      return res.status(500).json({ success: false, message: 'Erro ao atualizar cachorros associados ao passeador' });
    }

    // Excluir o passeador após atualizar os cachorros
    const deleteQuery = 'DELETE FROM passeadores WHERE id_passeador = $1';
    pool.query(deleteQuery, [passeadorId], (err, result) => {
      if (err) {
        console.error('Erro ao excluir passeador:', err);
        return res.status(500).json({ success: false, message: 'Erro ao excluir passeador' });
      }

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Passeador não encontrado' });
      }

      res.json({ success: true, message: 'Passeador excluído com sucesso!' });
    });
  });
});

app.get('/cachorros/:id_cliente/passeador', async (req, res) => {
  const { id_cliente } = req.params;

  try {
    const query = `
      SELECT id_passeador
      FROM passeios
      WHERE id_cliente = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [id_cliente]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Passeador não encontrado para o cliente.' });
    }

    res.json({ success: true, id_passeador: result.rows[0].id_passeador });
  } catch (error) {
    console.error('Erro ao buscar passeador:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar passeador.' });
  }
});

app.get('/passeios/:id_cliente', async (req, res) => {
  const { id_cliente } = req.params;

  try {
    const query = `
      SELECT TO_CHAR(horario_passeio, 'HH24:MI') AS horario_passeio
      FROM passeios
      WHERE id_cliente = $1
      LIMIT 1
    `;
    const result = await pool.query(query, [id_cliente]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Horário de passeio não encontrado para o cliente.' });
    }

    res.json({ success: true, horario_passeio: result.rows[0].horario_passeio });
  } catch (error) {
    console.error('Erro ao buscar horário de passeio:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar horário de passeio.' });
  }
});

app.get('/passeadores/:id/horarios', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT TO_CHAR(horario_passeio, 'HH24:MI') AS horario_passeio
      FROM passeios
      WHERE id_passeador = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.json({ success: true, horarios: [] }); // Retorna lista vazia se não houver horários
    }

    const horarios = result.rows.map(row => row.horario_passeio);
    res.json({ success: true, horarios });
  } catch (error) {
    console.error('Erro ao buscar horários de passeio:', error);
    res.status(500).json({ success: false, message: 'Erro ao buscar horários de passeio.' });
  }
});

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