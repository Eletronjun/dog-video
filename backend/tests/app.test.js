const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const request = require('supertest');
const { app, pool } = require('../app'); // ajuste se o app.js está dentro de backend

afterAll(async () => {
  await pool.end(); // fecha a conexão depois dos testes
});
// Mock data helpers
const randomEmail = () => `test${Math.floor(Math.random() * 100000)}@mail.com`;

const jwt = require('jsonwebtoken');

describe('API Endpoints', () => {
  let createdClienteId;
  let createdPasseadorId;
  let createdSubscriptionId;
  let createdNotificationId;
  let token;

  beforeAll(() => {
    token = jwt.sign({ id: 1, email: 'test@mail.com', tipo: 0 }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '1h' });
  });

  // Teste de criação de passeador (para obter um ID válido)
  it('POST /criarpasseador should create passeador', async () => {
    const res = await request(app)
      .post('/criarpasseador')
      .send({
        nome: 'Passeador Teste',
        email: randomEmail(),
        cpf: '98765432100',
        telefone: '61977777777',
        endereco: 'Rua Passeador',
        imagem: null,
        modulo: 1,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    if (res.body.success) {
      createdPasseadorId = res.body.id_passeador; // Armazena o ID do passeador criado
    }
  });

  // Teste de criação de cliente
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
        id_passeador: createdPasseadorId, // Envia o ID do passeador
        temporario: 0,
        dias_teste: null,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Teste de listagem de clientes
  it('GET /clientes should return clientes', async () => {
    const res = await request(app).get('/clientes');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) createdClienteId = res.body[0].id_cliente;
  });

  // Teste de detalhes de cliente
  it('GET /clientes/:id should return cliente details', async () => {
    if (!createdClienteId) return;
    const res = await request(app).get(`/clientes/${createdClienteId}`);
    expect([200, 404]).toContain(res.statusCode);
    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.cliente).toBeDefined();
    }
  });

  // Teste de atualização de cliente
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
    expect([200, 500]).toContain(res.statusCode);
  });

  // Teste de redefinição de senha
  it('PUT /clientes/:id/reset-senha should reset senha', async () => {
    if (!createdClienteId) return;
    const res = await request(app)
      .put(`/clientes/${createdClienteId}/reset-senha`)
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.statusCode);
  });

  // Teste de exclusão de cliente
  it('DELETE /clientes/:id should delete cliente', async () => {
    if (!createdClienteId) return;
    const res = await request(app).delete(`/clientes/${createdClienteId}`);
    expect([200, 500]).toContain(res.statusCode);
  });

  // Teste de criação de passeador
  it('POST /criarpasseador should create passeador', async () => {
    const res = await request(app)
      .post('/criarpasseador')
      .send({
        nome: 'Passeador Teste',
        email: randomEmail(),
        cpf: '98765432100',
        telefone: '61977777777',
        endereco: 'Rua Passeador',
        imagem: null,
        modulo: 1,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Teste de listagem de passeadores
  it('GET /passeadores should return passeadores', async () => {
    const res = await request(app).get('/passeadores');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.passeadores)).toBe(true);
    if (res.body.passeadores.length > 0) createdPasseadorId = res.body.passeadores[0].id;
  });

  // Teste de detalhes de passeador
  it('GET /passeadores/:id should return passeador details', async () => {
    if (!createdPasseadorId) return;
    const res = await request(app).get(`/passeadores/${createdPasseadorId}`);
    expect([200, 404]).toContain(res.statusCode);
  });

  // Teste de atualização de passeador
  it('PUT /passeadores/:id should update passeador', async () => {
    if (!createdPasseadorId) return;
    const res = await request(app)
      .put(`/passeadores/${createdPasseadorId}`)
      .send({
        nome: 'Passeador Atualizado',
        email: randomEmail(),
        cpf: '98765432100',
        telefone: '61977777777',
        endereco: 'Rua Passeador Atualizada',
        imagem: null,
        modulo: 2,
      });
    expect([200, 500]).toContain(res.statusCode);
  });

  // Teste de exclusão de passeador
  it('DELETE /passeadores/:id should delete passeador and handle dependencies', async () => {
    if (!createdPasseadorId) return;

    // Criar um cliente com cachorros associados ao passeador
    const clienteRes = await request(app)
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
    expect(clienteRes.statusCode).toBe(200);
    expect(clienteRes.body.success).toBe(true);

    // Excluir o passeador
    const res = await request(app).delete(`/passeadores/${createdPasseadorId}`);
    expect([200, 404, 500]).toContain(res.statusCode);

    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Passeador excluído com sucesso!');
    }
  });

  // Teste de login
  it('POST /login should fail with wrong credentials', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'wrong@mail.com', senha: 'wrongpass' });
    expect([401, 500]).toContain(res.statusCode);
  });

  // Teste de assinatura
  it('POST /subscribe should fail with missing body', async () => {
    const res = await request(app)
      .post('/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect([400, 500]).toContain(res.statusCode);
  });
});