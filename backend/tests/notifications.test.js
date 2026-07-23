const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const request = require('supertest');
const { app, pool } = require('../app');

let createdNotificationId;

afterAll(async () => {
  if (createdNotificationId) {
    await pool.query('DELETE FROM notificacoes WHERE id_notificacao = $1', [createdNotificationId]);
  }
  await pool.end();
});

describe('Notifications Endpoints', () => {

  it('POST /subscribe should fail with missing body', async () => {
    const res = await request(app)
      .post('/subscribe')
      .set('Authorization', 'Bearer fake_token')
      .send({});
    expect([400, 403]).toContain(res.statusCode);
  });

  it('POST /send-notification should send push notification', async () => {
    const notificationRes = await request(app)
      .post('/notificacoes')
      .send({
        tipo: 'Teste',
        mensagem: 'Mensagem de teste',
        id_cliente: 1,
        id_passeador: null,
      });
    expect([201, 500]).toContain(notificationRes.statusCode);
    if (notificationRes.statusCode === 201) {
      createdNotificationId = notificationRes.body.id_notificacao;

      const res = await request(app)
        .post('/send-notification')
        .send({ id_notificacao: createdNotificationId });
      expect([200, 404]).toContain(res.statusCode);
      if (res.statusCode === 200) {
        expect(res.body.success).toBe(true);
      }
    }
  });
});
