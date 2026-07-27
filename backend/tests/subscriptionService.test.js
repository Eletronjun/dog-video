const { saveSubscription } = require('../services/subscriptionService');
const { pool } = require('../app');

let testClientId;
const testEndpoint = 'https://push.example.com/test-subscription-endpoint';

beforeAll(async () => {
  const clientRes = await pool.query(`
    INSERT INTO clientes (nome, email, cpf, telefone, endereco, pacote, tipo, senha, alterar_senha)
    VALUES ('SubService Test User', 'subservice@test.com', '12312312399', '61999990000', 'Rua Teste Sub', 'mensal', 0, 'hash', 0)
    RETURNING id_cliente
  `);
  testClientId = clientRes.rows[0].id_cliente;
});

afterAll(async () => {
  if (testClientId) {
    await pool.query('DELETE FROM subscriptions WHERE id_cliente = $1', [testClientId]);
    await pool.query('DELETE FROM clientes WHERE id_cliente = $1', [testClientId]);
  }
  await pool.end();
});

describe('Subscription Service Unit Tests', () => {
  it('should reject with Error when subscription data is incomplete', async () => {
    const incompleteSub = { endpoint: '', keys: { p256dh: '', auth: '' } };
    await expect(saveSubscription(incompleteSub, null)).rejects.toThrow('Dados incompletos para salvar a subscription');
  });

  it('should save a new subscription successfully', async () => {
    const validSub = {
      endpoint: testEndpoint,
      keys: {
        p256dh: 'p256dh_sample_key',
        auth: 'auth_sample_key',
      },
    };

    const result = await saveSubscription(validSub, testClientId);
    expect(result).toBe('Subscription salva com sucesso');
  });

  it('should return Subscription já existe when subscription is already registered', async () => {
    const validSub = {
      endpoint: testEndpoint,
      keys: {
        p256dh: 'p256dh_sample_key',
        auth: 'auth_sample_key',
      },
    };

    const result = await saveSubscription(validSub, testClientId);
    expect(result).toBe('Subscription já existe');
  });

  it('should reject with Error when database check query fails', async () => {
    const validSub = {
      endpoint: 'https://push.example.com/error-select',
      keys: { p256dh: 'key', auth: 'auth' }
    };
    const origQuery = pool.query;
    jest.spyOn(pool, 'query').mockImplementation((queryText, params, callback) => {
      if (typeof callback === 'function') {
        return callback(new Error('DB Select Error'), null);
      }
      return origQuery.call(pool, queryText, params, callback);
    });

    await expect(saveSubscription(validSub, testClientId)).rejects.toThrow('Erro ao buscar subscription');
    pool.query.mockRestore();
  });

  it('should reject with Error when database insert query fails', async () => {
    const validSub = {
      endpoint: 'https://push.example.com/error-insert',
      keys: { p256dh: 'key', auth: 'auth' }
    };
    const origQuery = pool.query;
    jest.spyOn(pool, 'query').mockImplementation((queryText, params, callback) => {
      if (typeof callback === 'function') {
        if (queryText.includes('SELECT')) {
          return callback(null, { rows: [] });
        }
        if (queryText.includes('INSERT')) {
          return callback(new Error('DB Insert Error'), null);
        }
      }
      return origQuery.call(pool, queryText, params, callback);
    });

    await expect(saveSubscription(validSub, testClientId)).rejects.toThrow('Erro ao inserir subscription');
    pool.query.mockRestore();
  });
});
