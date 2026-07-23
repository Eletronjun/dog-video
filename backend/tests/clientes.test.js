const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const jwt = require('jsonwebtoken');

const request = require('supertest');
const { app, pool } = require('../app');
const { resetSenhaCliente } = require('../controllers/clientesController');

afterAll(async () => {
  await pool.end();
});

const randomEmail = () => `cli_test_${Math.floor(Math.random() * 1000000)}@mail.com`;

describe('Clientes Endpoints Comprehensive Tests', () => {
  let createdClienteId;
  let createdPasseadorId;
  let conflitoPasseadorId;
  let terceiroPasseadorId;
  let tempClientId;
  let authToken;

  beforeAll(async () => {
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    authToken = jwt.sign({ id: 1, email: 'admin@test.com', userType: 'admin' }, secret, { expiresIn: '1h' });

    const passeadorRes = await pool.query(`
      INSERT INTO passeadores (nome, email, cpf, telefone, endereco, modulo, modulo2)
      VALUES ('Passeador do Cliente Teste', 'passeador.cli.test@mail.com', '98765432199', '61988888888', 'Rua Passeador', 90, 91)
      RETURNING id_passeador
    `);
    createdPasseadorId = passeadorRes.rows[0].id_passeador;

    const conflitoPasseadorRes = await pool.query(`
      INSERT INTO passeadores (nome, email, cpf, telefone, endereco, modulo, modulo2)
      VALUES ('Passeador Conflito Teste', 'passeador.conf.test@mail.com', '98765432188', '61977777777', 'Rua Conflito', 90, 92)
      RETURNING id_passeador
    `);
    conflitoPasseadorId = conflitoPasseadorRes.rows[0].id_passeador;

    const terceiroRes = await pool.query(`
      INSERT INTO passeadores (nome, email, cpf, telefone, endereco, modulo, modulo2)
      VALUES ('Terceiro Passeador', 'terceiro.test@mail.com', '98765432177', '61966666666', 'Rua Terceiro', 90, 93)
      RETURNING id_passeador
    `);
    terceiroPasseadorId = terceiroRes.rows[0].id_passeador;
  });

  afterAll(async () => {
    if (tempClientId) {
      await pool.query('DELETE FROM passeios WHERE id_cliente = $1', [tempClientId]);
      await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [tempClientId]);
    }
    if (createdClienteId) {
      await pool.query('DELETE FROM passeios WHERE id_cliente = $1', [createdClienteId]);
      await pool.query('DELETE FROM cachorros WHERE id_cliente = $1', [createdClienteId]);
      await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [createdClienteId]);
    }
    if (createdPasseadorId) await pool.query('DELETE FROM passeadores WHERE id_passeador = $1', [createdPasseadorId]);
    if (conflitoPasseadorId) await pool.query('DELETE FROM passeadores WHERE id_passeador = $1', [conflitoPasseadorId]);
    if (terceiroPasseadorId) await pool.query('DELETE FROM passeadores WHERE id_passeador = $1', [terceiroPasseadorId]);
  });

  it('POST /criarcliente should fail when required fields are missing', async () => {
    const res = await request(app).post('/criarcliente').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Campos obrigatórios estão faltando');
  });

  it('POST /criarcliente should fail when missing id_passeador with dogs', async () => {
    const res = await request(app)
      .post('/criarcliente')
      .send({
        nome: 'Cliente Sem Passeador',
        email: randomEmail(),
        cpf: '12345678901',
        telefone: '61999999999',
        endereco: 'Rua Teste',
        pacote: 'mensal',
        caes: ['DogSemPasseador'],
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('ID do passeador é obrigatório');
  });

  it('POST /criarcliente should create client with dogs and passeador', async () => {
    const res = await request(app)
      .post('/criarcliente')
      .send({
        nome: 'Cliente Completo',
        email: randomEmail(),
        cpf: '12345678901',
        telefone: '61999999999',
        endereco: 'Rua Teste',
        pacote: 'mensal',
        caes: ['Dog1', 'Dog2'],
        id_passeador: createdPasseadorId,
        temporario: 0,
        dias_teste: null,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    createdClienteId = res.body.id_cliente;

    await pool.query(`
      INSERT INTO passeios (horario_passeio, id_cliente, id_passeador)
      VALUES ('15:00:00', $1, $2)
    `, [createdClienteId, createdPasseadorId]);
  });

  it('POST /criarcliente should detect module conflict', async () => {
    const res = await request(app)
      .post('/criarcliente')
      .send({
        nome: 'Cliente Conflito',
        email: randomEmail(),
        cpf: '12345678901',
        telefone: '61999999999',
        endereco: 'Rua Teste',
        pacote: 'mensal',
        id_passeador: conflitoPasseadorId,
        horario: '15:15',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Conflito de módulo detectado');
  });

  it('GET /clientes should return all clients', async () => {
    const res = await request(app).get('/clientes');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /clientes?simulateError=true should return 500 error', async () => {
    const res = await request(app).get('/clientes?simulateError=true');
    expect(res.statusCode).toBe(500);
  });

  it('GET /clientes/:id should return complete client details with walk and walker name', async () => {
    const res = await request(app).get(`/clientes/${createdClienteId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.cliente.nome).toBe('Cliente Completo');
    expect(res.body.cliente.passeador).toBe('Passeador do Cliente Teste');
  });

  it('PUT /clientes/:id should detect module conflict on update', async () => {
    const cTemp = await pool.query(`
      INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha)
      VALUES ('Temp 3', $1, '00000000000', '000000000', 'Rua', 'mensal', 0, 'hash')
      RETURNING id_cliente
    `, [randomEmail()]);
    tempClientId = cTemp.rows[0].id_cliente;
    await pool.query(`INSERT INTO passeios (horario_passeio, id_cliente, id_passeador) VALUES ('15:15:00', $1, $2)`, [tempClientId, terceiroPasseadorId]);

    const res = await request(app)
      .put(`/clientes/${createdClienteId}`)
      .send({
        nome: 'Cliente Completo Atualizado',
        email: randomEmail(),
        cpf: '12345678901',
        telefone: '61988888888',
        endereco: 'Rua Nova 456',
        pacote: 'anual',
        id_passeador: conflitoPasseadorId,
        horario_passeio: '15:15',
        caes: ['Dog1'],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toContain('Conflito de módulo detectado');
  });

  it('PUT /clientes/:id should update client info and dogs', async () => {
    const res = await request(app)
      .put(`/clientes/${createdClienteId}`)
      .send({
        nome: 'Cliente Completo Atualizado',
        email: randomEmail(),
        cpf: '12345678901',
        telefone: '61988888888',
        endereco: 'Rua Nova 456',
        pacote: 'anual',
        anotacoes: 'Obs nova',
        caes: ['DogNovo'],
        id_passeador: createdPasseadorId,
        dias_teste: '',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PUT /clientes/:id/reset-senha should reset password to default dog123', async () => {
    const res = await request(app)
      .put(`/clientes/${createdClienteId}/reset-senha`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('resetSenhaCliente should return 400 if clienteId is missing', async () => {
    const req = { params: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    await resetSenhaCliente(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('PUT /clientes/:id/reset-senha should return 404 for non-existent client', async () => {
    const res = await request(app)
      .put('/clientes/999999/reset-senha')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /clientes/999999 should handle deleting non-existent client', async () => {
    const res = await request(app).delete('/clientes/999999');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('DELETE /clientes/:id should delete client and associated data', async () => {
    const res = await request(app).delete(`/clientes/${createdClienteId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    createdClienteId = null;
  });
});
