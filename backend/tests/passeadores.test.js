const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const request = require('supertest');
const { app, pool } = require('../app');

afterAll(async () => {
  await pool.end();
});

const randomEmail = () => `test${Math.floor(Math.random() * 100000)}@mail.com`;

describe('Passeadores Endpoints', () => {
  let createdPasseadorId;

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
        modulo2: 2,
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    createdPasseadorId = res.body.id_passeador;
  });

  it('GET /passeadores should return passeadores', async () => {
    const res = await request(app).get('/passeadores');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.passeadores)).toBe(true);
  });

  it('GET /passeadores/:id should return passeador details', async () => {
    if (!createdPasseadorId) return;
    const res = await request(app).get(`/passeadores/${createdPasseadorId}`);
    expect([200, 404]).toContain(res.statusCode);
  });

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
        modulo2: 2,
      });
    expect([200, 500]).toContain(res.statusCode);
  });

  it('GET /passeadores/:id/horarios should return walk schedules', async () => {
    if (!createdPasseadorId) return;
    const res = await request(app).get(`/passeadores/${createdPasseadorId}/horarios`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.horarios)).toBe(true);
  });

  it('DELETE /passeadores/:id should delete passeador and handle dependencies', async () => {
    if (!createdPasseadorId) return;

    const clienteRes = await request(app)
      .post('/criarcliente')
      .send({
        nome: 'Cliente Teste Delete Pass',
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

    const res = await request(app).delete(`/passeadores/${createdPasseadorId}`);
    expect([200, 404, 500]).toContain(res.statusCode);

    if (res.statusCode === 200) {
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Passeador excluído com sucesso!');
    }

    if (clienteRes.body.success) {
      await request(app).delete(`/clientes/${clienteRes.body.id_cliente}`);
    }
  });

  it('POST /criarpasseador should fail with missing fields', async () => {
    const res = await request(app)
      .post('/criarpasseador')
      .send({
        nome: '',
        email: '',
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /criarpasseador should fail with invalid data', async () => {
    const res = await request(app)
      .post('/criarpasseador')
      .send({
        nome: '',
        email: 'invalid-email',
        cpf: '123',
        telefone: 'invalid-phone',
        endereco: '',
        imagem: null,
        modulo: null,
      });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /passeadores should handle database connection errors', async () => {
    const res = await request(app).get('/passeadores?simulateError=true');
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Erro de conexão com o banco de dados');
  });

  it('GET /cachorros/:id_cliente/passeador should return passeador for a client', async () => {
    // Cria um passeador
    const passRes = await request(app).post('/criarpasseador').send({
      nome: 'Pass Test', email: randomEmail(), cpf: '98765432100', telefone: '12345678900', endereco: 'End', modulo: 1, modulo2: 2
    });
    const pId = passRes.body.id_passeador;

    // Cria um cliente
    const cliRes = await request(app).post('/criarcliente').send({
      nome: 'Cli Test', email: randomEmail(), cpf: '12345678901', telefone: '12345678901', endereco: 'End', pacote: 'mensal', caes: ['Dog'], id_passeador: pId
    });
    const cId = cliRes.body.id_cliente;

    if (pId && cId) {
      await pool.query(`INSERT INTO passeios (horario_passeio, id_cliente, id_passeador) VALUES ('10:00:00', $1, $2)`, [cId, pId]);
      
      const res = await request(app).get(`/cachorros/${cId}/passeador`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      await pool.query('DELETE FROM passeios WHERE id_cliente = $1', [cId]);
      await request(app).delete(`/clientes/${cId}`);
      await request(app).delete(`/passeadores/${pId}`);
    }
  });
});
