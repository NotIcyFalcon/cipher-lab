const db = require('better-sqlite3')('./data/cyberbox.sqlite');
const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='homework'").get();
console.log(row ? row.sql : 'Table not found');
