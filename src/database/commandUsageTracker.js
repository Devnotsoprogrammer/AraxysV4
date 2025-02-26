const { QuickDB } = require("quick.db");
const path = require("path");
const dbPath = path.join(__dirname, "../db/commandUsage.sqlite");
const db = new QuickDB({ filePath: dbPath });

module.exports = db;
