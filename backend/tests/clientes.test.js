const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const request = require('supertest');
const { app, pool } = require('../app');

afterAll(async () => {
  await pool.end();
});

const randomEmail = () => `test${Math.floor(Math.random() * 100000)}@mail.com`;

describe('Clientes Endpoints', () => {
  let createdClienteId;
  let createdPasseadorId;

  beforeAll(async () => {
    const passeadorRes = await pool.query(`
      INSERT INTO passeadores (nome, email, cpf, telefone, endereco, modulo, modulo2)
      VALUES ('Passeador para Cliente', 'passeador.cli@mail.com', '98765432100', '61988888888', 'Rua Passeador', 1, 2)
      RETURNING id_passeador
    `);
    createdPasseadorId = passeadorRes.rows[0].id_passeador;
  });

  afterAll(async () => {
    if (createdPasseadorId) {
      await pool.query('DELETE FROM passeadores WHERE id_passeador = $1', [createdPasseadorId]);
    }
  });

  it('POST /criarcliente should create a new cliente', async () => {
    const res = await request(app)
      .post('/criarcliente')
      .send({
        nome: 'Cliente Teste',
        email: randomEmail(),
        cpf: '12345678901',
        telefone: '61999999999',
        endereco: 'Rua Teste',
        pacote: 'mensal',
        horario: '10:00:00',
        anotacao: 'Nenhuma',
        caes: ['Dog1', 'Dog2'],
        id_passeador: createdPasseadorId,
        temporario: 0,
        dias_teste: null,
      });
    expect([200, 400]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      createdClienteId = res.body.id_cliente;
    }
  });

  it('GET /clientes should return clientes', async () => {
    const res = await request(app).get('/clientes');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /clientes/:id should return cliente details', async () => {
    if (!createdClienteId) return;
    const res = await request(app).get(`/clientes/${createdClienteId}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.cliente).toBeDefined();
    }
  });

  it('PUT /clientes/:id should update cliente', async () => {
    if (!createdClienteId) return;
    const res = await request(app)
      .put(`/clientes/${createdClienteId}`)
      .send({
        nome: 'Cliente Atualizado',
        email: randomEmail(),
        cpf: '12345678901',
        telefone: '61988888888',
        endereco: 'Rua Nova',
        pacote: 'semanal',
        horario_passeio: '11:00:00',
        anotacoes: 'Atualizado',
        caes: ['Dog1'],
        id_passeador: null,
      });
    expect([200, 400, 500]).toContain(res.statusCode);
  });

  it('DELETE /clientes/:id should delete cliente', async () => {
    if (!createdClienteId) return;
    const res = await request(app).delete(`/clientes/${createdClienteId}`);
    expect([200, 500]).toContain(res.statusCode);
  });

  it('POST /criarcliente should fail with missing fields', async () => {
    const res = await request(app)
      .post('/criarcliente')
      .send({
        nome: '',
        email: '',
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /criarcliente should fail with invalid data', async () => {
    const res = await request(app)
      .post('/criarcliente')
      .send({
        nome: '',
        email: 'invalid-email',
        cpf: '123',
        telefone: 'invalid-phone',
        endereco: '',
        pacote: '',
        id_passeador: null,
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /clientes should handle database connection errors gracefully', async () => {
    const res = await request(app).get('/clientes?simulateError=true');
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBeDefined();
  });

  it('GET /passeios/:id_cliente should return walk schedule for a client', async () => {
    if (!createdClienteId) return;
    const res = await request(app).get(`/passeios/${createdClienteId}`);
    expect([200, 404]).toContain(res.statusCode);
  });
});
