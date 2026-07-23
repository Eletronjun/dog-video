const pool = require('../config/db');
const webPush = require('web-push');
const { saveSubscription } = require('../services/subscriptionService');

exports.subscribe = (req, res) => {
  const { subscription } = req.body;
  const id_cliente = req.user.userType === 'user' ? req.user.id : null;

  if (!id_cliente) {
    return res.status(400).json({ success: false, message: 'ID do cliente não fornecido' });
  }

  saveSubscription(subscription, id_cliente)
    .then((message) => res.status(201).json({ success: true, message }))
    .catch((error) => res.status(500).json({ success: false, message: error.message || error }));
};

exports.criarNotificacao = (req, res) => {
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
};

exports.enviarNotificacao = (req, res) => {
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
};
