const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');

const request = require('supertest');
const { app, pool } = require('../app');

afterAll(async () => {
  await pool.end();
});

const randomEmail = () => `auth_test_${Math.floor(Math.random() * 1000000)}@mail.com`;

describe('Auth Endpoints Full Coverage Tests', () => {
  let createdClienteId;
  let rawPassword = 'testpassword123';
  let email;

  beforeAll(async () => {
    email = randomEmail();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const res = await pool.query(`
      INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha, alterar_senha)
      VALUES ('Auth Full Test', $1, '12345678901', '61999999999', 'Rua Teste', 'mensal', 0, $2, 1)
      RETURNING id_cliente
    `, [email, hashedPassword]);
    createdClienteId = res.rows[0].id_cliente;
  });

  afterAll(async () => {
    if (createdClienteId) {
      await pool.query('DELETE FROM subscriptions WHERE id_cliente = $1', [createdClienteId]);
      await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [createdClienteId]);
    }
  });

  it('POST /login should authenticate successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({
        email: email,
        senha: rawPassword,
        subscription: {
          endpoint: 'https://push.example.com/test',
          keys: { p256dh: 'p256dh_key', auth: 'auth_key' }
        }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.userType).toBe('user');
  });

  it('POST /login should fail with wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: email, senha: 'wrongpassword' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /login should handle rate-limiting after 5 failed attempts', async () => {
    const lockEmail = randomEmail();
    for (let i = 0; i < 5; i++) {
      await request(app).post('/login').send({ email: lockEmail, senha: 'wrong' });
    }

    const res = await request(app).post('/login').send({ email: lockEmail, senha: 'wrong' });
    expect(res.statusCode).toBe(429);
    expect(res.body.message).toContain('Muitas tentativas de login');
  });

  it('POST /alterar-senha should fail when id_cliente is missing', async () => {
    const res = await request(app)
      .post('/alterar-senha')
      .send({ novaSenha: 'newpassword123' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /alterar-senha should return 404 for non-existent client', async () => {
    const res = await request(app)
      .post('/alterar-senha')
      .send({ id_cliente: 999999, novaSenha: 'newpassword123', termo_aceito: true });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('POST /alterar-senha should update password successfully', async () => {
    const res = await request(app)
      .post('/alterar-senha')
      .send({ id_cliente: createdClienteId, novaSenha: 'newpassword123', termo_aceito: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /aceitar-termo should fail when id_cliente is missing', async () => {
    const res = await request(app).post('/aceitar-termo').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /aceitar-termo should accept terms successfully', async () => {
    const res = await request(app)
      .post('/aceitar-termo')
      .send({ id_cliente: createdClienteId });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
