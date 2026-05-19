const mongoose = require('mongoose');

async function connectDatabase() {
  const connectionString = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/task_manager';

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(connectionString);
  return mongoose.connection;
}

module.exports = {
  connectDatabase,
};