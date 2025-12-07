const express = require('express');
const { Pool } = require('pg'); 
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 3001;
const webPush = require('web-push');
const bcrypt = require('bcryptjs'); 
const saltRounds = 10;
const cron = require('node-cron');
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

// Conexão com o PostgreSQL (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false 
  }
});

// Teste de conexão (opcional)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
  } else {
    console.log('Conexão bem-sucedida com PostgreSQL. Hora atual:', res.rows[0].now);
  }
});

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

  jwt.verify(token, 'your_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token inválido' });
    }
    req.user = user; // Adiciona os dados do usuário logado à requisição
    next();
  });
};

// Função reutilizável para verificar e salvar subscriptions
const saveSubscription = (subscription, id_cliente) => {
  return new Promise((resolve, reject) => {
    const { endpoint, keys } = subscription;
    const { p256dh, auth } = keys;

    if (!endpoint || !p256dh || !auth || !id_cliente) {
      console.error('Dados incompletos para salvar a subscription:', { endpoint, p256dh, auth, id_cliente });
      return reject('Dados incompletos para salvar a subscription');
    }

    const checkQuery = 'SELECT * FROM subscriptions WHERE endpoint = $1 AND id_cliente = $2';
    pool.query(checkQuery, [endpoint, id_cliente], (err, results) => {
      if (err) {
        console.error('Erro ao buscar subscription:', err);
        return reject('Erro ao buscar subscription');
      }

      if (results.rows.length > 0) {
        return resolve('Subscription já existe');
      } else {
        const insertQuery = `
          INSERT INTO subscriptions (endpoint, expiration_time, p256dh, auth, id_cliente)
          VALUES ($1, NULL, $2, $3, $4)
        `;
        pool.query(insertQuery, [endpoint, p256dh, auth, id_cliente], (err) => {
          if (err) {
            console.error('Erro ao inserir subscription:', err);
            return reject('Erro ao inserir subscription');
          }
          return resolve('Subscription salva com sucesso');
        });
      }
    });
  });
};

// Função para verificar conflitos de módulo
const verificarConflitoModulo = async (id_passeador, horario_passeio, id_cliente = null, id_passeador_atual = null) => {
  const query = `
    SELECT p.horario_passeio, pa.modulo, pa.modulo2, pa.nome AS nome_passeador, p.id_cliente
    FROM passeios p
    JOIN passeadores pa ON p.id_passeador = pa.id_passeador
    WHERE pa.id_passeador != $1 -- Ignora o passeador selecionado
    AND ($2::TEXT IS NULL OR p.id_cliente::TEXT != $2::TEXT) -- Ignora o cliente atual, se fornecido
    AND pa.id_passeador != $3 -- Ignora o passeador atual, se fornecido
    AND (pa.modulo = (SELECT modulo FROM passeadores WHERE id_passeador = $1)
         OR pa.modulo2 = (SELECT modulo2 FROM passeadores WHERE id_passeador = $1)) -- Verifica conflitos nos módulos do novo passeador
  `;
  const result = await pool.query(query, [
    id_passeador,
    id_cliente ? id_cliente.toString() : null,
    id_passeador_atual,
  ]);

  const horarioNovo = dayjs(horario_passeio, 'HH:mm:ss');
  for (const row of result.rows) {
    const horarioExistente = dayjs(row.horario_passeio, 'HH:mm:ss');
    const diferenca = Math.abs(horarioNovo.diff(horarioExistente, 'minute'));

    if (diferenca <= 60) { // Verifica se está dentro de 1 hora antes ou depois
      return {
        conflito: true,
        modulo: row.modulo,
        modulo2: row.modulo2,
        nomePasseador: row.nome_passeador,
      };
    }
  }

  return { conflito: false };
};

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

// Cron job para enviar notificação 5 minutos antes do passeio
cron.schedule('* * * * *', () => {
  const query = `
    SELECT p.id_cliente, p.horario_passeio
    FROM passeios p
  `;

  pool.query(query, (err, passeios) => {
    if (err) {
      console.error('Erro ao buscar passeios para notificação:', err);
      return;
    }

    const now = dayjs().tz('America/Sao_Paulo'); // Ajuste para o timezone correto

    passeios.rows.forEach((passeio) => {
      const walkTime = dayjs(passeio.horario_passeio, 'HH:mm:ss');
      const notificationTime = walkTime.subtract(5, 'minute');

      if (now.format('HH:mm') === notificationTime.format('HH:mm')) {
        const subQuery = 'SELECT * FROM subscriptions WHERE id_cliente = $1';
        pool.query(subQuery, [passeio.id_cliente], (err, subscriptions) => {
          if (err) {
            console.error('Erro ao buscar subscriptions para notificação:', err);
            return;
          }

          if (subscriptions.rows.length === 0) {
            return;
          }

          subscriptions.rows.forEach((sub) => {
            const pushSubscription = {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            };
            const payload = JSON.stringify({
              title: 'Lembrete de Passeio',
              body: 'Seu pet começará o passeio em 5 minutos!'
            });

            webPush.sendNotification(pushSubscription, payload)
              .catch((error) => {
                console.error(`Erro ao enviar notificação para o cliente ${passeio.id_cliente}:`, error);
              });
          });
        });
      }
    });
  });
});

// Cron job para excluir clientes temporários com base no dias_teste
cron.schedule('0 2 * * *', async () => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Processando exclusão de clientes temporários...`);

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN'); // Inicia transação

    // 1. Obter IDs dos clientes a serem excluídos
    const { rows } = await client.query(`
      SELECT id_cliente FROM clientes
      WHERE temporario = 1
      AND dias_teste IS NOT NULL
      AND NOW() >= criado_em + (dias_teste * INTERVAL '1 day')
    `);

    // 2. Para cada cliente, excluir registros dependentes
    for (const { id_cliente } of rows) {
      // Excluir de subscriptions
      await client.query('DELETE FROM subscriptions WHERE id_cliente = $1', [id_cliente]);
      
      // Excluir de cachorros
      await client.query('DELETE FROM cachorros WHERE id_cliente = $1', [id_cliente]);
      
      // Excluir de outras tabelas relacionadas...
    }

    // 3. Finalmente excluir os clientes
    const deleteResult = await client.query(`
      DELETE FROM clientes
      WHERE id_cliente = ANY($1)
    `, [rows.map(r => r.id_cliente)]);

    await client.query('COMMIT'); // Confirma transação
    console.log(`[${timestamp}] ${deleteResult.rowCount} clientes excluídos com sucesso.`);

  } catch (err) {
    await client.query('ROLLBACK'); // Reverte em caso de erro
    console.error(`[${timestamp}] Erro na exclusão:`, err);
  } finally {
    client.release(); // Libera o cliente de conexão
  }
});

// Variáveis para controle de tentativas de login
const loginAttempts = {}; // Armazena tentativas de login { "email@example.com": { attempts: 0, lastAttempt: Date.now() } }
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 10 * 60 * 1000; // 10 minutos em milissegundos

// Endpoint para login com proteção contra ataques de força bruta
app.post('/login', (req, res) => {
  const { email, senha, subscription } = req.body; // Adicione subscription ao corpo da requisição

  // Verifica se o usuário está temporariamente bloqueado
  if (loginAttempts[email] && loginAttempts[email].attempts >= MAX_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - loginAttempts[email].lastAttempt;
    if (timeSinceLastAttempt < LOCKOUT_TIME) {
      return res.status(429).json({ success: false, message: 'Muitas tentativas de login. Tente novamente mais tarde.' });
    } else {
      // Redefine o contador após o período de bloqueio
      loginAttempts[email] = { attempts: 0, lastAttempt: Date.now() };
    }
  }

  // Consulta para buscar o cliente pelo email
  const query = 'SELECT * FROM clientes WHERE email = $1';
  pool.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ success: false, message: 'Erro ao consultar o banco de dados' });
    }

    if (results.rows.length === 0) {
      // Incrementa o contador de tentativas de login falhas
      if (!loginAttempts[email]) {
        loginAttempts[email] = { attempts: 1, lastAttempt: Date.now() };
      } else {
        loginAttempts[email].attempts += 1;
        loginAttempts[email].lastAttempt = Date.now();
      }

      return res.status(401).json({ success: false, message: 'Email ou senha incorretos' });
    }

    const cliente = results.rows[0];

    // Compara a senha digitada com o hash armazenado no banco
    const match = await bcrypt.compare(senha, cliente.senha);

    if (!match) {
      // Incrementa o contador de tentativas de login falhas
      if (!loginAttempts[email]) {
        loginAttempts[email] = { attempts: 1, lastAttempt: Date.now() };
      } else {
        loginAttempts[email].attempts += 1;
        loginAttempts[email].lastAttempt = Date.now();
      }

      return res.status(401).json({ success: false, message: 'Email ou senha incorretos' });
    }

    // Login bem-sucedido: reseta tentativas de login
    loginAttempts[email] = { attempts: 0, lastAttempt: Date.now() };

    const userType = cliente.tipo === 1 ? 'admin' : 'user';

    // Gera um token JWT para ser possível fazer a verificação de login nas rotas /admin, /clientes, /passeadores ....
    const token = jwt.sign({ id: cliente.id_cliente, email: cliente.email, userType: userType }, 'your_secret_key', { expiresIn: '1h' });

    // Salva a subscription no banco de dados, se fornecida e o cliente for do tipo 0
    if (subscription && cliente.tipo === 0) {
      saveSubscription(subscription, cliente.id_cliente)
        .catch((error) => console.error('Erro ao salvar subscription:', error));
    }

    // Retorna resposta de sucesso e dados do usuário
    res.json({
      success: true,
      userType: userType,
      alterar_senha: cliente.alterar_senha,
      id_cliente: cliente.id_cliente,
    });
  });
});

// Endpoint para alterar a senha
app.post('/alterar-senha', async (req, res) => {
  const { novaSenha, id_cliente, termo_aceito } = req.body;

  if (!id_cliente) {
    return res.status(400).json({ success: false, message: 'ID do cliente não fornecido' });
  }

  try {
    // Gera o hash da nova senha antes de salvar no banco
    const hashedPassword = await bcrypt.hash(novaSenha, saltRounds);

    // Atualiza a senha do cliente no banco de dados
    const query = `
      UPDATE clientes 
      SET senha = $1, 
          alterar_senha = 0,
          termo_aceito = $2
      WHERE id_cliente = $3
    `;

    pool.query(query, [hashedPassword, termo_aceito === true, id_cliente], (err, result) => {
      if (err) {
        console.error('Erro ao atualizar senha:', err);
        return res.status(500).json({ success: false, message: 'Erro ao atualizar senha' });
      }

      // Verifica se o ID do cliente existe no banco de dados
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      }

      res.json({ success: true, message: 'Senha redefinida com sucesso!' });
    });

  } catch (error) {
    console.error('Erro ao criptografar senha:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar senha' });
  }
});

// Endpoint para registrar aceite da Política de Privacidade
app.post('/aceitar-termo', async (req, res) => {
  const { id_cliente } = req.body;

  if (!id_cliente) {
    return res.status(400).json({ success: false, message: 'ID do cliente não fornecido' });
  }

  try {
    const query = 'UPDATE clientes SET termo_aceito = TRUE WHERE id_cliente = $1';
    await pool.query(query, [id_cliente]);

    res.json({ success: true, message: 'Política de Privacidade aceita com sucesso!' });
  } catch (error) {
    console.error('Erro ao registrar aceite da Política de Privacidade:', error);
    res.status(500).json({ success: false, message: 'Erro ao registrar aceite da Política de Privacidade' });
  }
});

// Endpoint para aparecer os clientes
app.get('/clientes', (req, res) => {
  const query = 'SELECT * FROM clientes WHERE tipo = 0';

  pool.query(query, (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).send('Erro ao consultar o banco de dados');
    }
    res.json(results.rows);
  });
});

// Endpoint unificado para buscar os dados completos de um cliente
app.get('/clientes/:id', (req, res) => {
  const clienteId = req.params.id;

  const queryCliente = `
    SELECT nome, email, cpf, telefone, endereco, anotacoes, pacote, dias_teste, alterar_senha, termo_aceito
    FROM clientes
    WHERE id_cliente = $1
  `;


  const queryCachorros = `
    SELECT nome
    FROM cachorros
    WHERE id_cliente = $1
  `;

  const queryPasseio = `
    SELECT id_passeador, TO_CHAR(horario_passeio, 'HH24:MI') AS horario_passeio
    FROM passeios
    WHERE id_cliente = $1
    LIMIT 1
  `;

  const queryPasseador = `
    SELECT nome
    FROM passeadores
    WHERE id_passeador = $1
  `;

  pool.query(queryCliente, [clienteId], (err, clienteResults) => {
    if (err) {
      console.error('Erro ao consultar cliente:', err);
      return res.status(500).json({ success: false, message: 'Erro ao consultar cliente' });
    }

    if (clienteResults.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
    }

    const cliente = clienteResults.rows[0];

    pool.query(queryCachorros, [clienteId], (err, cachorroResults) => {
      if (err) {
        console.error('Erro ao consultar cachorros:', err);
        return res.status(500).json({ success: false, message: 'Erro ao consultar cachorros' });
      }

      const caes = cachorroResults.rows.map(cachorro => cachorro.nome);

      pool.query(queryPasseio, [clienteId], (err, passeioResults) => {
        if (err) {
          console.error('Erro ao consultar passeio:', err);
          return res.status(500).json({ success: false, message: 'Erro ao consultar passeio' });
        }

        if (passeioResults.rows.length === 0) {
          return res.json({
            success: true,
            cliente: {
              ...cliente,
              caes,
              horario_passeio: null,
              passeador: null,
            },
          });
        }

        const { id_passeador, horario_passeio } = passeioResults.rows[0];

        pool.query(queryPasseador, [id_passeador], (err, passeadorResults) => {
          if (err) {
            console.error('Erro ao consultar passeador:', err);
            return res.status(500).json({ success: false, message: 'Erro ao consultar passeador' });
          }

          const passeador = passeadorResults.rows.length > 0 ? passeadorResults.rows[0].nome : null;

          res.json({
            success: true,
            cliente: {
              ...cliente,
              caes,
              horario_passeio,
              passeador,
            },
          });
        });
      });
    });
  });
});

// Endpoint para atualizar um cliente
app.put('/clientes/:id', async (req, res) => {
  const clienteId = req.params.id;
  const { nome, email, cpf, telefone, endereco, pacote, anotacoes, caes, id_passeador, dias_teste, horario_passeio } = req.body;

  try {
    if (horario_passeio && id_passeador) {
      const horarioFormatado = `${horario_passeio}:00`;

      // Busca o passeador atual associado ao cliente
      const passeadorAtualQuery = `
        SELECT c.id_passeador
        FROM cachorros c
        WHERE c.id_cliente = $1
        LIMIT 1
      `;
      const passeadorAtualResult = await pool.query(passeadorAtualQuery, [clienteId]);
      const id_passeador_atual = passeadorAtualResult.rows.length > 0 ? passeadorAtualResult.rows[0].id_passeador : null;

      const conflito = await verificarConflitoModulo(id_passeador, horarioFormatado, clienteId, id_passeador_atual);

      if (conflito.conflito) {
        return res.status(400).json({
          success: false,
          message: `Conflito de módulo detectado. O passeador ${conflito.nomePasseador} está usando o módulo ${conflito.modulo} e ${conflito.modulo2} em um horário próximo.`,
        });
      }
    }

    // Converte dias_teste para null se for uma string vazia
    const diasTesteValue = dias_teste === '' ? null : dias_teste;

    // Busca o passeador atual associado ao cliente
    const passeadorAtualQuery = `
      SELECT c.id_passeador
      FROM cachorros c
      WHERE c.id_cliente = $1
      LIMIT 1
    `;
    const passeadorAtualResult = await pool.query(passeadorAtualQuery, [clienteId]);
    const passeadorAtual = passeadorAtualResult.rows.length > 0 ? passeadorAtualResult.rows[0].id_passeador : null;

    const updateClienteQuery = `
      UPDATE clientes
      SET nome = $1, email = $2, cpf = $3, telefone = $4, endereco = $5, 
          pacote = $6, anotacoes = $7, dias_teste = $8
      WHERE id_cliente = $9
    `;

    await pool.query(updateClienteQuery, [
      nome,
      email,
      cpf,
      telefone,
      endereco,
      pacote,
      anotacoes,
      diasTesteValue, // Usa null se dias_teste for uma string vazia
      clienteId,
    ]);

    if (caes && caes.length > 0) {
      const deleteDogsQuery = 'DELETE FROM cachorros WHERE id_cliente = $1';
      await pool.query(deleteDogsQuery, [clienteId]);

      const insertDogQuery = 'INSERT INTO cachorros (nome, id_cliente, id_passeador) VALUES ($1, $2, $3)';
      for (const cao of caes) {
        await pool.query(insertDogQuery, [cao, clienteId, id_passeador || passeadorAtual]); // Mantém o passeador atual se não for alterado
      }
    }

    res.json({ success: true, message: 'Cliente e cachorros atualizados com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar cliente.' });
  }
});

// Endpoint para redefinir a senha do cliente
app.put('/clientes/:id/reset-senha', authenticateToken, async (req, res) => {
  const clienteId = req.params.id;

  if (!clienteId) {
    return res.status(400).json({ success: false, message: 'ID do cliente não fornecido' });
  }

  try {
    const novaSenha = 'dog123';
    const senhaHash = await bcrypt.hash(novaSenha, 10);

    const updatePasswordQuery = `
      UPDATE clientes 
      SET senha = $1, alterar_senha = 1 
      WHERE id_cliente = $2`;

    pool.query(updatePasswordQuery, [senhaHash, clienteId], (err, result) => {
      if (err) {
        console.error('Erro ao redefinir senha:', err);
        return res.status(500).json({ success: false, message: 'Erro ao redefinir senha' });
      }

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      }

      res.json({ success: true, message: 'Senha redefinida com sucesso!' });
    });
  } catch (error) {
    console.error('Erro ao processar senha:', error);
    res.status(500).json({ success: false, message: 'Erro interno ao processar senha' });
  }
});

// Endpoint para criar um cliente
app.post('/criarcliente', async (req, res) => {
  const { nome, email, cpf, telefone, endereco, pacote, anotacao, caes, id_passeador, temporario, dias_teste, horario } = req.body;

  try {
    if (horario && id_passeador) {
      const horarioFormatado = `${horario}:00`;
      const conflito = await verificarConflitoModulo(id_passeador, horarioFormatado);

      if (conflito.conflito) {
        return res.status(400).json({
          success: false,
          message: `Conflito de módulo detectado. O passeador ${conflito.nomePasseador} está usando o módulo ${conflito.modulo} e ${conflito.modulo2} em um horário próximo.`,
        });
      }
    }

    // Gera o hash da senha padrão "dog123"
    const hashedPassword = await bcrypt.hash('dog123', saltRounds);

    // Query atualizada para incluir temporario e dias_teste
    const insertClientQuery = `
      INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, anotacoes, tipo, senha, temporario, dias_teste)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10)
      RETURNING id_cliente
    `;

    const clientResult = await pool.query(insertClientQuery, [
      nome, 
      email, 
      cpf, 
      telefone, 
      endereco, 
      pacote, 
      anotacao, 
      hashedPassword,
      temporario,
      dias_teste
    ]);

    // Certifique-se de que o id_cliente foi retornado
    if (!clientResult.rows || clientResult.rows.length === 0) {
      return res.status(500).json({ success: false, message: 'Erro ao criar cliente: ID não retornado.' });
    }

    const clienteId = clientResult.rows[0].id_cliente;

    // Verifica se há cães para adicionar
    if (caes && caes.length > 0) {
      // Verifica se id_passeador foi fornecido
      if (!id_passeador) {
        return res.status(400).json({ success: false, message: 'ID do passeador é obrigatório quando há cães.' });
      }

      const insertDogQuery = 'INSERT INTO cachorros (nome, id_cliente, id_passeador) VALUES ($1, $2, $3)';
      for (const cao of caes) {
        await pool.query(insertDogQuery, [cao, clienteId, id_passeador]);
      }
    }

    res.json({ success: true, message: 'Cliente e cães adicionados com sucesso!', id_cliente: clienteId });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar cliente.' });
  }
});

// Endpoint para criar passeios
app.post('/passeios', async (req, res) => {
  const { horario_passeio, id_cliente, id_passeador } = req.body;

  try {
    const query = `
      INSERT INTO passeios (horario_passeio, id_cliente, id_passeador)
      VALUES ($1, $2, $3)
    `;
    const result = await pool.query(query, [horario_passeio, id_cliente, id_passeador || null]);

    res.status(201).json({ success: true, message: 'Passeio criado com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar passeio:', error);
    res.status(500).json({ success: false, message: 'Erro ao criar passeio.' });
  }
});

// Endpoint para atualizar passeios
app.put('/passeios/:id_cliente', async (req, res) => {
  const { id_cliente } = req.params;
  let { horario_passeio, id_passeador } = req.body;

  // Garante que id_passeador seja null se for uma string vazia
  id_passeador = id_passeador === "" ? null : id_passeador;

  try {
    const query = `
      UPDATE passeios
      SET horario_passeio = $1, id_passeador = $2
      WHERE id_cliente = $3
    `;
    const result = await pool.query(query, [horario_passeio, id_passeador, id_cliente]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Passeio não encontrado para o cliente.' });
    }

    res.json({ success: true, message: 'Passeio atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar passeio:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar passeio.' });
  }
});

// Endpoint para excluir um cliente e seus cachorros
app.delete('/clientes/:id', (req, res) => {
  const clienteId = req.params.id;

  // Query para deletar as subscriptions associadas ao cliente
  const deleteSubscriptionsQuery = 'DELETE FROM subscriptions WHERE id_cliente = $1';
  // Query para deletar os cachorros associados ao cliente
  const deleteCachorrosQuery = 'DELETE FROM cachorros WHERE id_cliente = $1';
  // Query para deletar o cliente
  const deleteClienteQuery = 'DELETE FROM clientes WHERE id_cliente = $1';

  // Deletar as subscriptions associadas ao cliente
  pool.query(deleteSubscriptionsQuery, [clienteId], (err) => {
    if (err) {
      console.error('Erro ao deletar subscriptions:', err);
      return res.status(500).send('Erro ao deletar subscriptions');
    }

    // Deletar os cachorros associados ao cliente
    pool.query(deleteCachorrosQuery, [clienteId], (err) => {
      if (err) {
        console.error('Erro ao deletar cachorros:', err);
        return res.status(500).send('Erro ao deletar cachorros');
      }

      // Deletar o cliente após deletar os cachorros e subscriptions
      pool.query(deleteClienteQuery, [clienteId], (err) => {
        if (err) {
          console.error('Erro ao deletar cliente:', err);
          return res.status(500).send('Erro ao deletar cliente');
        }

        res.json({ success: true, message: 'Cliente e seus dados associados deletados com sucesso!' });
      });
    });
  });
});

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
  `;

  pool.query(query, [nome, email, cpf, telefone, endereco, imagemBlob, modulo, modulo2], (err) => {
    if (err) {
      console.error('Erro ao criar passeador:', err);
      return res.status(500).json({ success: false, message: 'Erro ao criar passeador' });
    }
    res.json({ success: true, message: 'Passeador criado com sucesso!' });
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

// Inicia o servidor apenas se o arquivo for executado diretamente
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });
}

// Exporta o app e o pool de conexões
module.exports = { app, pool };