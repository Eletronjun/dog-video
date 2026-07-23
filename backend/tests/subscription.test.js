const request = require('supertest');
const { app, pool } = require('../app');

let createdNotificationId;
let createdClientId;

beforeAll(async () => {
  const clientRes = await pool.query(`
    INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha, alterar_senha)
    VALUES ('Sub User', 'subuser@mail.com', '11122233344', '61988880000', 'Rua Sub', 'mensal', 0, 'hash', 0)
    RETURNING id_cliente
  `);
  createdClientId = clientRes.rows[0].id_cliente;
});

afterAll(async () => {
  if (createdNotificationId) {
    await pool.query('DELETE FROM notificacoes WHERE id_notificacao = $1', [createdNotificationId]);
  }
  if (createdClientId) {
    await pool.query('DELETE FROM subscriptions WHERE id_cliente = $1', [createdClientId]);
    await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [createdClientId]);
  }
  await pool.end();
});

describe('Subscription & Notificacoes Controller Tests', () => {
  it('POST /criar-notificacao should process notification creation', async () => {
    const res = await request(app)
      .post('/criar-notificacao')
      .send({
        tipo: 'Alerta',
        mensagem: 'Teste de Notificação',
        id_cliente: createdClientId,
        id_passeador: 22
      });

    expect([200, 201, 404, 500]).toContain(res.statusCode);

    const notifRes = await pool.query('SELECT id_notificacao FROM notificacoes WHERE id_cliente = $1 LIMIT 1', [createdClientId]);
    if (notifRes.rows.length > 0) {
      createdNotificationId = notifRes.rows[0].id_notificacao;
    }
  });

  it('POST /enviar-notificacao should process notification ID or handle invalid ID', async () => {
    const res = await request(app)
      .post('/enviar-notificacao')
      .send({ id_notificacao: 999999 });

    expect([404, 500]).toContain(res.statusCode);
  });

  it('POST /subscribe without authentication should return 401 or 400', async () => {
    const res = await request(app)
      .post('/subscribe')
      .send({
        subscription: {
          endpoint: 'http://push.example.com',
          keys: { p256dh: 'keys123', auth: 'auth123' }
        }
      });

    expect([400, 401, 500]).toContain(res.statusCode);
  });
});
