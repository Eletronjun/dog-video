const { verificarConflitoModulo, verificarConflitoModuloPasseador } = require('../services/conflitoService');
const { pool } = require('../app');

afterAll(async () => {
  await pool.end();
});

describe('Conflito Service Tests', () => {
  it('verificarConflitoModulo should return conflito: false when no schedule conflict exists', async () => {
    const res = await verificarConflitoModulo(99999, '12:00:00');
    expect(res).toEqual({ conflito: false });
  });

  it('verificarConflitoModuloPasseador should return conflito: false when walker has no schedule', async () => {
    const res = await verificarConflitoModuloPasseador(1, 2, 99999);
    expect(res).toEqual({ conflito: false });
  });
});
