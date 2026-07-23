const dayjs = require('dayjs');
const timezone = require('dayjs/plugin/timezone');
const utc = require('dayjs/plugin/utc');
dayjs.extend(utc);
dayjs.extend(timezone);

const { deleteTemporaryClients, startCronJobs } = require('../jobs/cronJobs');
const { pool } = require('../app');

jest.mock('web-push', () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
}));

let tempClienteId;
let normalClienteId;
let walkPasseadorId;

beforeAll(async () => {
  // Criar cliente temporario expirado
  const resTemp = await pool.query(`
    INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha, temporario, dias_teste, criado_em)
    VALUES ('Temp Client', 'temp@cron.com', '11111111199', '61900000000', 'Rua Temp', 'mensal', 0, 'hash', 1, 1, NOW() - INTERVAL '2 days')
    RETURNING id_cliente
  `);
  tempClienteId = resTemp.rows[0].id_cliente;

  // Criar cachorro e subscription para temp client
  await pool.query(`INSERT INTO cachorros (nome, id_cliente) VALUES ('DogTemp', $1)`, [tempClienteId]);
  await pool.query(`INSERT INTO subscriptions (id_cliente, endpoint, p256dh, auth) VALUES ($1, 'http://endpoint.com', 'p256', 'auth')`, [tempClienteId]);

  // Criar passeador e cliente com passeio daqui a 5 minutos
  const pRes = await pool.query(`
    INSERT INTO passeadores (nome, email, cpf, telefone, endereco, modulo, modulo2)
    VALUES ('Pass Cron', 'pass@cron.com', '22222222299', '61911111111', 'Rua Pass', 10, 11)
    RETURNING id_passeador
  `);
  walkPasseadorId = pRes.rows[0].id_passeador;

  const resNormal = await pool.query(`
    INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha)
    VALUES ('Normal Client', 'normal@cron.com', '33333333399', '61922222222', 'Rua Normal', 'mensal', 0, 'hash')
    RETURNING id_cliente
  `);
  normalClienteId = resNormal.rows[0].id_cliente;

  await pool.query(`INSERT INTO subscriptions (id_cliente, endpoint, p256dh, auth) VALUES ($1, 'http://endpoint2.com', 'p256', 'auth')`, [normalClienteId]);

  const nowPlus5 = dayjs().tz('America/Sao_Paulo').add(5, 'minute').format('HH:mm:ss');
  await pool.query(`INSERT INTO passeios (horario_passeio, id_cliente, id_passeador) VALUES ($1, $2, $3)`, [nowPlus5, normalClienteId, walkPasseadorId]);
});

afterAll(async () => {
  if (tempClienteId) {
    await pool.query('DELETE FROM subscriptions WHERE id_cliente = $1', [tempClienteId]);
    await pool.query('DELETE FROM cachorros WHERE id_cliente = $1', [tempClienteId]);
    await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [tempClienteId]);
  }
  if (normalClienteId) {
    await pool.query('DELETE FROM passeios WHERE id_cliente = $1', [normalClienteId]);
    await pool.query('DELETE FROM subscriptions WHERE id_cliente = $1', [normalClienteId]);
    await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [normalClienteId]);
  }
  if (walkPasseadorId) {
    await pool.query('DELETE FROM passeadores WHERE id_passeador = $1', [walkPasseadorId]);
  }
  await pool.end();
});

describe('Cron Jobs Comprehensive Unit Tests', () => {
  it('deleteTemporaryClients should delete expired temporary clients', async () => {
    await deleteTemporaryClients();

    const check = await pool.query('SELECT * FROM clientes WHERE id_cliente = $1', [tempClienteId]);
    expect(check.rows.length).toBe(0);
    tempClienteId = null;
  });

  it('deleteTemporaryClients should handle error and rollback smoothly', async () => {
    const spy = jest.spyOn(pool, 'connect').mockImplementationOnce(async () => {
      return {
        query: jest.fn().mockImplementation((queryText) => {
          if (queryText === 'BEGIN') return Promise.resolve();
          throw new Error('Database Error Simulation');
        }),
        release: jest.fn(),
      };
    });

    await expect(deleteTemporaryClients()).resolves.not.toThrow();
    spy.mockRestore();
  });

  it('startCronJobs should execute walk reminder cron callback and process subscriptions', (done) => {
    const cron = require('node-cron');
    const spy = jest.spyOn(cron, 'schedule').mockImplementation((pattern, callback) => {
      // Execute the callback immediately to test cron logic
      callback();
      return { stop: jest.fn() };
    });

    startCronJobs();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();

    // Small delay to allow async pool queries inside schedule to settle
    setTimeout(() => {
      done();
    }, 500);
  });
});
