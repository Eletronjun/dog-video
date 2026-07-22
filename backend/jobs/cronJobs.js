const cron = require('node-cron');
const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
const pool = require('../config/db');
const webPush = require('web-push');

dayjs.extend(utc);
dayjs.extend(timezone);

const startCronJobs = () => {
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
  cron.schedule('0 2 * * *', deleteTemporaryClients);
};

const deleteTemporaryClients = async () => {
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
      await client.query('DELETE FROM subscriptions WHERE id_cliente = $1', [id_cliente]);
      await client.query('DELETE FROM cachorros WHERE id_cliente = $1', [id_cliente]);
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
};

module.exports = { startCronJobs, deleteTemporaryClients };
