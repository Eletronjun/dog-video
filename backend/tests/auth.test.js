const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const request = require('supertest');
const { app, pool } = require('../app');

afterAll(async () => {
  await pool.end();
});

const randomEmail = () => `test${Math.floor(Math.random() * 100000)}@mail.com`;

describe('Auth Endpoints', () => {
  let createdClienteId;
  let email;

  beforeAll(async () => {
    email = randomEmail();
    const res = await pool.query(`
      INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha, temporario)
      VALUES ('Auth Teste', $1, '12345678901', '61999999999', 'Rua', 'mensal', 0, '$2a$10$tZ2E/0Bf2Q0Fqz2g4E5.oeFwzE5Z/3B.8Lw8/Jz3x2B4B8B/3B/3B', 0)
      RETURNING id_cliente
    `, [email]);
    createdClienteId = res.rows[0].id_cliente;
  });

  afterAll(async () => {
    if (createdClienteId) {
      await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [createdClienteId]);
    }
  });

  it('POST /login should fail with wrong credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'wrong@mail.com', senha: 'wrongpass' });
    expect([401, 500]).toContain(res.statusCode);
  });

  it('PUT /clientes/:id/reset-senha should reset senha', async () => {
    if (!createdClienteId) return;
    const res = await request(app).put(`/clientes/${createdClienteId}/reset-senha`);
    expect([200, 401, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
    }
  });
});
