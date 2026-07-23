const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const request = require('supertest');
const { app, pool } = require('../app');

afterAll(async () => {
  await pool.end();
});

const randomEmail = () => `test${Math.floor(Math.random() * 100000)}@mail.com`;

describe('Passeadores Endpoints Comprehensive Tests', () => {
  let createdPasseadorId;
  let tempClienteId;

  it('POST /criarpasseador should create passeador', async () => {
    const res = await request(app)
      .post('/criarpasseador')
      .send({
        nome: 'Passeador Teste',
        email: randomEmail(),
        cpf: '98765432100',
        telefone: '61977777777',
        endereco: 'Rua Passeador',
        imagem: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        modulo: 101,
        modulo2: 102,
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    createdPasseadorId = res.body.id_passeador;
  });

  it('GET /passeadores should return all passeadores', async () => {
    const res = await request(app).get('/passeadores');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.passeadores)).toBe(true);
  });

  it('GET /passeadores/:id should return 400 for invalid ID', async () => {
    const res = await request(app).get('/passeadores/undefined');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('ID do passeador inválido');
  });

  it('GET /passeadores/:id should return 404 for non-existent ID', async () => {
    const res = await request(app).get('/passeadores/999999');
    expect(res.statusCode).toBe(404);
  });

  it('GET /passeadores/:id should return passeador details and image conversion', async () => {
    const res = await request(app).get(`/passeadores/${createdPasseadorId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.passeador.nome).toBe('Passeador Teste');
  });

  it('PUT /passeadores/:id should update passeador info and image', async () => {
    const res = await request(app)
      .put(`/passeadores/${createdPasseadorId}`)
      .send({
        nome: 'Passeador Atualizado',
        email: randomEmail(),
        cpf: '98765432100',
        telefone: '61977777777',
        endereco: 'Rua Passeador Atualizada',
        imagem: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        modulo: 101,
        modulo2: 102,
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /passeadores/:id/horarios should return walk schedules when walks exist', async () => {
    const cliRes = await pool.query(`
      INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha)
      VALUES ('Cli Horarios', $1, '00000000000', '000000000', 'Rua', 'mensal', 0, 'hash')
      RETURNING id_cliente
    `, [randomEmail()]);
    tempClienteId = cliRes.rows[0].id_cliente;
    await pool.query(`INSERT INTO passeios (horario_passeio, id_cliente, id_passeador) VALUES ('16:00:00', $1, $2)`, [tempClienteId, createdPasseadorId]);

    const res = await request(app).get(`/passeadores/${createdPasseadorId}/horarios`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.horarios.length).toBeGreaterThan(0);

    await pool.query(`DELETE FROM passeios WHERE id_cliente = $1`, [tempClienteId]);
    await pool.query(`DELETE FROM clientes WHERE id_cliente = $1`, [tempClienteId]);
    tempClienteId = null;
  });

  it('GET /api/passeadores/modulo/:modulo should return 400 for invalid modulo', async () => {
    const res = await request(app).get('/api/passeadores/modulo/invalid');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('ID do módulo inválido.');
  });

  it('GET /api/passeadores/modulo/:modulo should return 404 for empty modulo', async () => {
    const res = await request(app).get('/api/passeadores/modulo/999999');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Nenhum passeador encontrado para este módulo.');
  });

  it('GET /api/passeadores/modulo/:modulo should return passeadores for valid modulo', async () => {
    const res = await request(app).get('/api/passeadores/modulo/101');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.passeadores.length).toBeGreaterThan(0);
  });

  it('GET /cachorros/:id_cliente/passeador should return 400 for invalid cliente ID', async () => {
    const res = await request(app).get('/cachorros/invalid/passeador');
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('ID do cliente inválido.');
  });

  it('GET /cachorros/:id_cliente/passeador should return 404 when no passeador found', async () => {
    const res = await request(app).get('/cachorros/999999/passeador');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Passeador não encontrado para o cliente.');
  });

  it('GET /cachorros/:id_cliente/passeador should find passeador from cachorros table if no passeios exist', async () => {
    const cliRes = await request(app).post('/criarcliente').send({
      nome: 'Cli Dog Only',
      email: randomEmail(),
      cpf: '12345678901',
      telefone: '12345678901',
      endereco: 'End',
      pacote: 'mensal',
      caes: ['DogWithoutPasseio'],
      id_passeador: createdPasseadorId
    });
    const cId = cliRes.body.id_cliente;

    const res = await request(app).get(`/cachorros/${cId}/passeador`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.id_passeador).toBe(createdPasseadorId);

    await request(app).delete(`/clientes/${cId}`);
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

  it('GET /passeadores should handle database connection errors', async () => {
    const res = await request(app).get('/passeadores?simulateError=true');
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Erro de conexão com o banco de dados');
  });

  it('DELETE /passeadores/999999 should return 404 for non-existent passeador', async () => {
    const res = await request(app).delete('/passeadores/999999');
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Passeador não encontrado');
  });

  it('DELETE /passeadores/:id should delete passeador and unassign dogs', async () => {
    const res = await request(app).delete(`/passeadores/${createdPasseadorId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
