const request = require('supertest');
const { app, pool } = require('../app');

let testClientId;
const testPasseadorId = 22;

beforeAll(async () => {
  const clientRes = await pool.query(`
    INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha, alterar_senha)
    VALUES ('Passeio Test User', 'passeiotest@mail.com', '77788899900', '61988887777', 'Rua Teste', 'mensal', 0, 'hash', 0)
    RETURNING id_cliente
  `);
  testClientId = clientRes.rows[0].id_cliente;
});

afterAll(async () => {
  if (testClientId) {
    await pool.query('DELETE FROM passeios WHERE id_cliente = $1', [testClientId]);
    await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [testClientId]);
  }
  await pool.end();
});

describe('Passeios Controller API Tests', () => {
  it('POST /passeios should create a walk', async () => {
    const res = await request(app)
      .post('/passeios')
      .send({
        horario_passeio: '14:30',
        id_cliente: testClientId,
        id_passeador: testPasseadorId
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('GET /passeios/:id_cliente should fetch walk schedule', async () => {
    const res = await request(app).get(`/passeios/${testClientId}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.horario_passeio).toBe('14:30');
  });

  it('PUT /passeios/:id_cliente should update walk schedule', async () => {
    const res = await request(app)
      .put(`/passeios/${testClientId}`)
      .send({
        horario_passeio: '16:00',
        id_passeador: testPasseadorId
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /passeios/999999 should return 404 for non-existing client walk', async () => {
    const res = await request(app).get('/passeios/999999');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
