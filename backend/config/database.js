const mongoose = require('mongoose');

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required');

  mongoose.set('strictQuery', true);

  const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE) || 50;
  const minPoolSize = Number(process.env.MONGODB_MIN_POOL_SIZE) || 5;
  const serverSelectionTimeoutMS = Number(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS) || 10_000;

  await mongoose.connect(uri, {
    maxPoolSize,
    minPoolSize,
    serverSelectionTimeoutMS,
    socketTimeoutMS: 45_000,
  });

  mongoose.connection.on('error', (err) => {
    console.error('[mongodb] connection error:', err.message);
  });

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
