const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    console.log('✅ Google DNS configured for MongoDB Atlas resolution');
  } catch (e) {
    console.error('Failed to set custom DNS servers:', e.message);
  }

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
