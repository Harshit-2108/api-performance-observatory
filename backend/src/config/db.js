const connectDatabase = require('./database');

/**
 * Legacy db.js wrapper. Redirects to new database.js module to maintain compatibility.
 */
module.exports = connectDatabase;
