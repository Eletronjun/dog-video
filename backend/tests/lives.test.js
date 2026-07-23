const request = require('supertest');
const { app, pool } = require('../app');

afterAll(async () => {
  await pool.end();
});

describe('Lives Controller API Tests', () => {
  it('GET /api/lives/modulo/abc should return 400 for invalid module ID', async () => {
    const res = await request(app).get('/api/lives/modulo/abc');
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('ID do módulo inválido.');
  });

  it('GET /api/lives/modulo/999999 should return 404 when no live exists', async () => {
    const res = await request(app).get('/api/lives/modulo/999999');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/lives/modulo/999 should return live data if registered', async () => {
    await pool.query("INSERT INTO lives (canal, title, url, youtube_id, modulo) VALUES ('Test Channel', 'Test Live', 'http://example.com', 'yt123', 999)");

    const res = await request(app).get('/api/lives/modulo/999');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.live.url).toBe('http://example.com');

    await pool.query("DELETE FROM lives WHERE modulo = 999");
  });
});
