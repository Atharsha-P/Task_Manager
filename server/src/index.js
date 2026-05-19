require('dotenv').config();

const { connectDatabase } = require('./lib/database');
const { createApp } = require('./app');

async function bootstrap() {
  await connectDatabase();
  const app = createApp();

  const port = Number(process.env.PORT || 5000);

  app.listen(port, () => {
    console.log(`Task Manager API running on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});