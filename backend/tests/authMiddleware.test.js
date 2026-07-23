const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');

describe('Auth Middleware Tests', () => {
  it('should return 401 when no token is provided', () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token não fornecido',
    });
  });

  it('should return 403 for invalid token', () => {
    const req = { headers: { authorization: 'Bearer invalid_token' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Token inválido',
    });
  });

  it('should call next() and attach user for valid token', () => {
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    const payload = { id: 1, email: 'test@user.com' };
    const token = jwt.sign(payload, secret);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(1);
  });
});
