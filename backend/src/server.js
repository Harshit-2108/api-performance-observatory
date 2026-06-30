require('dotenv').config();
const app = require('./app');
const connectDatabase = require('./config/database');
const { startMonitoringEngine } = require('./services/monitorEngine');

const PORT = process.env.PORT || 5000;

// Start server after connecting to MongoDB
const startServer = async () => {
  try {
    await connectDatabase();
    
    const server = app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      // Initialize monitoring scheduling engine
      startMonitoringEngine();
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err, promise) => {
      console.log(`Unhandled Rejection: ${err.message}`);
      // Close server & exit process
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
