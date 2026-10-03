// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require('better-sqlite3');
const db = new Database('C:/Users/Yash Ola/cipher-lab/data/cyberbox.sqlite');
const rows = db.prepare("SELECT sql FROM sqlite_master WHERE type='table'").all();
console.log(rows.map(r => r.sql).join('\n\n'));
