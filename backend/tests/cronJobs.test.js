const { deleteTemporaryClients, startCronJobs } = require('../jobs/cronJobs');
const { pool } = require('../app');

afterAll(async () => {
  await pool.end();
});

describe('Cron Jobs Unit Tests', () => {
  it('deleteTemporaryClients should execute without errors', async () => {
    await expect(deleteTemporaryClients()).resolves.not.toThrow();
  });

  it('startCronJobs should initialize schedules', () => {
    expect(() => startCronJobs()).not.toThrow();
  });
});
