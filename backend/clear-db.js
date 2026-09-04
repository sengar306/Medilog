const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDB, disconnectDB } = require('./config/db');

const clearAllData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log(`Found ${collections.length} collections in database.`);

    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      console.log(`Clearing collection: ${collectionName}...`);
      await db.collection(collectionName).deleteMany({});
      console.log(`✅ Collection '${collectionName}' cleared.`);
    }

    console.log('\n🎉 All MongoDB collections have been completely cleared of data!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
};

clearAllData();
