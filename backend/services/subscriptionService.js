const pool = require('../config/db');

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

module.exports = { saveSubscription };
