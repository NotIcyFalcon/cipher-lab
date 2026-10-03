// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('better-sqlite3')('./data/cyberbox.sqlite');
const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='ctf_completions'").get();
console.log(row ? row.sql : 'Table not found');
