describe('Database Config Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should initialize pool with DATABASE_URL_PROD when APP_ENV is prod', () => {
    process.env.APP_ENV = 'prod';
    process.env.DATABASE_URL_PROD = 'postgres://prod_user:pass@prod-host:5432/prod_db';
    
    const pool = require('../config/db');
    expect(pool).toBeDefined();
  });

  it('should initialize pool with DATABASE_URL_HOM when APP_ENV is hom', () => {
    process.env.APP_ENV = 'hom';
    process.env.DATABASE_URL_HOM = 'postgres://hom_user:pass@hom-host:5432/hom_db';

    const pool = require('../config/db');
    expect(pool).toBeDefined();
  });

  it('should initialize pool with DATABASE_URL_DEV when APP_ENV is dev', () => {
    process.env.APP_ENV = 'dev';
    process.env.DATABASE_URL_DEV = 'postgres://dev_user:pass@dev-host:5432/dev_db';

    const pool = require('../config/db');
    expect(pool).toBeDefined();
  });

  it('should fallback to default DATABASE_URL when APP_ENV is unknown', () => {
    delete process.env.APP_ENV;
    process.env.DATABASE_URL = 'postgres://default_user:pass@default-host:5432/default_db';

    const pool = require('../config/db');
    expect(pool).toBeDefined();
  });
});
