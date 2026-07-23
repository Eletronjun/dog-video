const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  let token = req.headers['authorization'];
  if (token?.startsWith('Bearer ')) {
    token = token.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token não fornecido' });
  }

  const secret = process.env.JWT_SECRET || 'your_secret_key';
  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Token inválido' });
    }

    req.user = user;
    next();
  });
};

module.exports = authenticateToken;