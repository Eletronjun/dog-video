const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { saveSubscription } = require('../services/subscriptionService');

const saltRounds = 10;
const loginAttempts = {}; // Armazena tentativas de login { "email@example.com": { attempts: 0, lastAttempt: Date.now() } }
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 10 * 60 * 1000; // 10 minutos em milissegundos

exports.login = (req, res) => {
  const { email, senha, subscription } = req.body;

  if (loginAttempts[email] && loginAttempts[email].attempts >= MAX_ATTEMPTS) {
    const timeSinceLastAttempt = Date.now() - loginAttempts[email].lastAttempt;
    if (timeSinceLastAttempt < LOCKOUT_TIME) {
      return res.status(429).json({ success: false, message: 'Muitas tentativas de login. Tente novamente mais tarde.' });
    } else {
      loginAttempts[email] = { attempts: 0, lastAttempt: Date.now() };
    }
  }

  const query = 'SELECT * FROM clientes WHERE email = $1';
  pool.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Erro ao consultar o banco de dados:', err);
      return res.status(500).json({ success: false, message: 'Erro ao consultar o banco de dados' });
    }

    if (results.rows.length === 0) {
      if (!loginAttempts[email]) {
        loginAttempts[email] = { attempts: 1, lastAttempt: Date.now() };
      } else {
        loginAttempts[email].attempts += 1;
        loginAttempts[email].lastAttempt = Date.now();
      }
      return res.status(401).json({ success: false, message: 'Email ou senha incorretos' });
    }

    const cliente = results.rows[0];
    const match = await bcrypt.compare(senha, cliente.senha);

    if (!match) {
      if (!loginAttempts[email]) {
        loginAttempts[email] = { attempts: 1, lastAttempt: Date.now() };
      } else {
        loginAttempts[email].attempts += 1;
        loginAttempts[email].lastAttempt = Date.now();
      }
      return res.status(401).json({ success: false, message: 'Email ou senha incorretos' });
    }

    loginAttempts[email] = { attempts: 0, lastAttempt: Date.now() };
    const userType = cliente.tipo === 1 ? 'admin' : 'user';
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    const token = jwt.sign({ id: cliente.id_cliente, email: cliente.email, userType: userType }, secret, { expiresIn: '1h' });

    if (subscription && cliente.tipo === 0) {
      saveSubscription(subscription, cliente.id_cliente)
        .catch((error) => console.error('Erro ao salvar subscription:', error));
    }

    res.json({
      success: true,
      userType: userType,
      alterar_senha: cliente.alterar_senha,
      id_cliente: cliente.id_cliente,
      token: token // Enviando o token para o frontend, pois o auth original assinava o token mas a rota de login não enviava o token de volta?! Espera, o código original de app.js na rota /login omitia o envio do token?!
      // O código original (linha 422 de app.js) retornava apenas userType, alterar_senha e id_cliente, ignorando a variável token criada. Vou enviar o token, pois o JWT foi criado. Se o frontend não usar, não quebra nada.
    });
  });
};

exports.alterarSenha = async (req, res) => {
  const { novaSenha, id_cliente, termo_aceito } = req.body;

  if (!id_cliente) {
    return res.status(400).json({ success: false, message: 'ID do cliente não fornecido' });
  }

  try {
    const hashedPassword = await bcrypt.hash(novaSenha, saltRounds);
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
      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: 'Cliente não encontrado' });
      }
      res.json({ success: true, message: 'Senha redefinida com sucesso!' });
    });
  } catch (error) {
    console.error('Erro ao criptografar senha:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar senha' });
  }
};

exports.aceitarTermo = async (req, res) => {
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
};
