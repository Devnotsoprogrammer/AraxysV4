const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const db = new sqlite3.Database(path.join(__dirname, "../db/premium.db"));

db.serialize(() => {
  // Premium users table
  db.run(`CREATE TABLE IF NOT EXISTS premium_users (
    user_id TEXT PRIMARY KEY,
    premium_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
  )`);

  // Premium guilds table
  db.run(`CREATE TABLE IF NOT EXISTS premium_guilds (
    guild_id TEXT PRIMARY KEY,
    premium_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
  )`);
});

module.exports = db;
