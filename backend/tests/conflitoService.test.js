const { verificarConflitoModulo, verificarConflitoModuloPasseador } = require('../services/conflitoService');
const { pool } = require('../app');

let passeador1Id, passeador2Id, clienteId, cliente2Id;

beforeAll(async () => {
  const p1 = await pool.query(`
    INSERT INTO passeadores (nome, email, cpf, telefone, endereco, modulo, modulo2)
    VALUES ('Passeador Conf 1', 'pconf1@test.com', '11111111111', '61911111111', 'Rua 1', 77, 88)
    RETURNING id_passeador
  `);
  passeador1Id = p1.rows[0].id_passeador;

  const p2 = await pool.query(`
    INSERT INTO passeadores (nome, email, cpf, telefone, endereco, modulo, modulo2)
    VALUES ('Passeador Conf 2', 'pconf2@test.com', '22222222222', '61922222222', 'Rua 2', 77, 99)
    RETURNING id_passeador
  `);
  passeador2Id = p2.rows[0].id_passeador;

  const c = await pool.query(`
    INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha, alterar_senha)
    VALUES ('Cliente Conf 1', 'cconf1@test.com', '33333333333', '61933333333', 'Rua 3', 'mensal', 0, 'hash', 0)
    RETURNING id_cliente
  `);
  clienteId = c.rows[0].id_cliente;

  const c2 = await pool.query(`
    INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha, alterar_senha)
    VALUES ('Cliente Conf 2', 'cconf2@test.com', '44444444444', '61944444444', 'Rua 4', 'mensal', 0, 'hash', 0)
    RETURNING id_cliente
  `);
  cliente2Id = c2.rows[0].id_cliente;

  // Passeio para passeador 1 às 14:00
  await pool.query(`
    INSERT INTO passeios (horario_passeio, id_cliente, id_passeador)
    VALUES ('14:00:00', $1, $2)
  `, [clienteId, passeador1Id]);

  // Passeio para passeador 2 às 14:30
  await pool.query(`
    INSERT INTO passeios (horario_passeio, id_cliente, id_passeador)
    VALUES ('14:30:00', $1, $2)
  `, [cliente2Id, passeador2Id]);
});

afterAll(async () => {
  if (clienteId) {
    await pool.query('DELETE FROM passeios WHERE id_cliente = $1 OR id_cliente = $2', [clienteId, cliente2Id]);
    await pool.query('DELETE FROM clientes WHERE id_cliente = $1 OR id_cliente = $2', [clienteId, cliente2Id]);
  }
  if (passeador1Id) await pool.query('DELETE FROM passeadores WHERE id_passeador = $1', [passeador1Id]);
  if (passeador2Id) await pool.query('DELETE FROM passeadores WHERE id_passeador = $1', [passeador2Id]);
  await pool.end();
});

describe('Conflito Service Tests', () => {
  it('verificarConflitoModulo should return conflito: false when no schedule conflict exists', async () => {
    const res = await verificarConflitoModulo(passeador2Id, '20:00:00');
    expect(res.conflito).toBe(false);
  });

  it('verificarConflitoModulo should detect conflict when walk is within 60 minutes in same module', async () => {
    const res = await verificarConflitoModulo(passeador1Id, '14:15:00');
    expect(res.conflito).toBe(true);
    expect(res.nomePasseador).toBe('Passeador Conf 2');
  });

  it('verificarConflitoModuloPasseador should return conflito: false when walker has no schedule', async () => {
    const res = await verificarConflitoModuloPasseador(77, 88, 99999);
    expect(res.conflito).toBe(false);
  });

  it('verificarConflitoModuloPasseador should detect conflict when walker schedule collides with another walker in same module', async () => {
    const res = await verificarConflitoModuloPasseador(77, 88, passeador2Id);
    expect(res.conflito).toBe(true);
    expect(res.nomePasseador).toBe('Passeador Conf 1');
  });
});
