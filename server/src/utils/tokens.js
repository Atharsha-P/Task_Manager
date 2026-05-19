const jwt = require('jsonwebtoken');

function createAppToken(user) {
  const secret = process.env.JWT_SECRET || 'task-manager-development-secret';
  const userId = user._id ? user._id.toString() : String(user.id);

  return jwt.sign(
    {
      id: userId,
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