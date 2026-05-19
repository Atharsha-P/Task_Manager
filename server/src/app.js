const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

function createApp() {
  const app = express();
  const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: clientOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => {
    res.json({ message: 'Task Manager Backend Running Successfully' });
  });

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, service: 'task-manager-api' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/tasks', taskRoutes);

  app.use((error, req, res, next) => {
    console.error(error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      message: error.message || 'Internal server error',
    });
  });

  return app;
}

module.exports = {
  createApp,
};