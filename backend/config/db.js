const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

const connectDB = async () => {
  try {
    let dbUrl = process.env.MONGODB_URI;

    if (!dbUrl) {
      console.log('MONGODB_URI not set. Spinning up mongodb-memory-server...');
      mongod = await MongoMemoryServer.create({ startupTimeout: 60000 });
      dbUrl = mongod.getUri();
      console.log(`In-memory MongoDB started at: ${dbUrl}`);
    }

    const conn = await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    
    // Fallback if local connection fails
    if (!mongod) {
      try {
        console.log('Retrying with in-memory MongoDB due to connection failure...');
        mongod = await MongoMemoryServer.create({ startupTimeout: 60000 });
        const dbUrl = mongod.getUri();
        const conn = await mongoose.connect(dbUrl, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        });
        console.log(`In-memory MongoDB connected successfully: ${conn.connection.host}`);
        return conn;
      } catch (innerError) {
        console.error(`In-memory MongoDB launch failed: ${innerError.message}`);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongod) {
      await mongod.stop();
    }
    console.log('MongoDB Disconnected');
  } catch (error) {
    console.error('Error disconnecting database:', error.message);
  }
};

module.exports = { connectDB, disconnectDB };
