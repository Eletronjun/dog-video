const errorHandler = require('../middleware/errorHandler');

describe('Error Handler Middleware Tests', () => {
  it('should handle custom error with status and message', () => {
    const err = { status: 400, message: 'Bad request test', stack: 'stacktrace' };
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Bad request test',
    });
  });

  it('should fallback to 500 status and default message', () => {
    const err = { stack: 'stacktrace' };
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Ocorreu um erro interno no servidor',
    });
  });
});
