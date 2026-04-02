const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'backend', 'ceylonlands.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking property ID 23...');
db.get('SELECT * FROM properties WHERE id = 23', (err, row) => {
    if (err) {
        console.error(err);
    } else {
        console.log(JSON.stringify(row, null, 2));
    }
    db.close();
});
