const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error(
      '❌ MONGO_URI environment variable is not set.\n' +
      '   Set it to your MongoDB Atlas connection string in the Render dashboard\n' +
      '   or in a local .env file (see .env.example).'
    );
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected');
  } catch (error) {
    console.error('Error disconnecting database:', error.message);
  }
};

module.exports = { connectDB, disconnectDB };
