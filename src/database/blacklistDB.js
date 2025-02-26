const sqlite3 = require('sqlite3').verbose();
const path = require("path");

const db = new sqlite3.Database(path.join(__dirname, "../db/blacklist.db"));

db.serialize(() => {
  // Create blacklisted_users table
  db.run(`CREATE TABLE IF NOT EXISTS blacklisted_users (
    userId TEXT NOT NULL PRIMARY KEY
  )`);

  // Create blacklisted_servers table
  db.run(`CREATE TABLE IF NOT EXISTS blacklisted_servers (
    guildId TEXT NOT NULL PRIMARY KEY
  )`);
});

module.exports = db;
