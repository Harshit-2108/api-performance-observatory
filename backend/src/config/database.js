const mongoose = require('mongoose');
const logger = require('../services/loggerService');

/**
 * Establishes a connection to the MongoDB database using Mongoose.
 * Throws an error if MONGODB_URI is not defined or connection fails.
 */
const connectDatabase = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
      const errorMsg = 'MONGODB_URI is not defined in environment variables';
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout before failure
    });

    logger.info(`MongoDB Connected successfully to host: ${conn.connection.host}`);
    
    // Set a process variable confirming database connection state
    process.env.DB_CONNECTED = 'true';

    // Seed database if empty
    const seedDatabase = require('./seedDb');
    await seedDatabase();
    
    return conn;
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`, { stack: error.stack });
    process.env.DB_CONNECTED = 'false';
    // Throw error so server boot sequence can intercept and shut down gracefully
    throw error;
  }
};

module.exports = connectDatabase;
