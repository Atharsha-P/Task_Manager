const jwt = require('jsonwebtoken');

function createAppToken(user) {
  const secret = process.env.JWT_SECRET || 'task-manager-development-secret';

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    },
    secret,
    { expiresIn: '7d' },
  );
}

module.exports = {
  createAppToken,
};