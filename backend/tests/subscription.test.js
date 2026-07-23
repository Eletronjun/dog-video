const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, pool } = require('../app');

jest.mock('web-push', () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
}));

let createdNotificationId;
let createdClientId;
let userToken;
let adminToken;

beforeAll(async () => {
  const secret = process.env.JWT_SECRET || 'your_secret_key';

  const clientRes = await pool.query(`
    INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha, alterar_senha)
    VALUES ('Sub User', 'subuser@mail.com', '11122233344', '61988880000', 'Rua Sub', 'mensal', 0, 'hash', 0)
    RETURNING id_cliente
  `);
  createdClientId = clientRes.rows[0].id_cliente;

  userToken = jwt.sign({ id: createdClientId, email: 'subuser@mail.com', userType: 'user' }, secret, { expiresIn: '1h' });
  adminToken = jwt.sign({ id: 1, email: 'admin@mail.com', userType: 'admin' }, secret, { expiresIn: '1h' });

  // Insert a subscription for the client
  await pool.query(`
    INSERT INTO subscriptions (id_cliente, endpoint, p256dh, auth)
    VALUES ($1, 'https://fcm.googleapis.com/fcm/send/test-endpoint', 'test-p256dh', 'test-auth')
  `, [createdClientId]);
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
  it('POST /subscribe without user role should return 400', async () => {
    const res = await request(app)
      .post('/subscribe')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        subscription: {
          endpoint: 'https://push.example.com',
          keys: { p256dh: 'keys123', auth: 'auth123' }
        }
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('ID do cliente não fornecido');
  });

  it('POST /subscribe with valid user token should save subscription', async () => {
    const res = await request(app)
      .post('/subscribe')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        subscription: {
          endpoint: 'https://push.example.com/sub2',
          keys: { p256dh: 'keys123', auth: 'auth123' }
        }
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST /criar-notificacao should create a notification', async () => {
    const res = await request(app)
      .post('/criar-notificacao')
      .send({
        tipo: 'Alerta Teste',
        mensagem: 'Mensagem de teste de Notificação',
        id_cliente: createdClientId,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    const notifRes = await pool.query('SELECT id_notificacao FROM notificacoes WHERE id_cliente = $1 LIMIT 1', [createdClientId]);
    if (notifRes.rows.length > 0) {
      createdNotificationId = notifRes.rows[0].id_notificacao;
    }
  });

  it('POST /enviar-notificacao with non-existent notification ID should return 404', async () => {
    const res = await request(app)
      .post('/enviar-notificacao')
      .send({ id_notificacao: 999999 });

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Notificação não encontrada');
  });

  it('POST /enviar-notificacao with valid notification ID should trigger push delivery', async () => {
    expect(createdNotificationId).toBeDefined();

    const res = await request(app)
      .post('/enviar-notificacao')
      .send({ id_notificacao: createdNotificationId });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Notificações enviadas com sucesso!');
  });
});
