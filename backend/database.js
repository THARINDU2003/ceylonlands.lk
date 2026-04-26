const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'ceylonlands.db'));

// Create tables
db.serialize(() => {
    // Properties table
    db.run(`
        CREATE TABLE IF NOT EXISTS properties (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            property_type TEXT CHECK(property_type IN ('Land', 'House', 'Apartment', 'Commercial')),
            offer_type TEXT CHECK(offer_type IN ('Sale', 'Rent')),
            bedrooms INTEGER,
            bathrooms INTEGER,
            land_area REAL,
            address TEXT,
            city TEXT,
            district TEXT,
            seller_name TEXT NOT NULL,
            seller_phone TEXT NOT NULL,
            seller_email TEXT,
            images TEXT,
            views INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pending',
            expiry_date DATETIME,
            created_at DATETIME
        )
    `);

    // Inquiries table
    db.run(`
        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            property_id INTEGER,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            message TEXT,
            created_at DATETIME,
            FOREIGN KEY (property_id) REFERENCES properties(id)
        )
    `);

    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            account_type TEXT DEFAULT 'personal',
            company_name TEXT,
            balance REAL DEFAULT 0,
            permissions TEXT DEFAULT '[]', -- JSON array of strings: 'data_entry', 'edit_all', 'user_mgmt', 'media_mgmt'
            created_at DATETIME DEFAULT (datetime('now'))
        )
    `);

    // Migrations to support existing live databases
    db.run("ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0", () => {});
    db.run("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[]'", () => {});
    db.run("ALTER TABLE properties ADD COLUMN expiry_date DATETIME", () => {});

    // Agents table
    db.run(`
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT NOT NULL,
            whatsapp TEXT,
            photo TEXT,
            license_number TEXT,
            created_at DATETIME DEFAULT (datetime('now'))
        )
    `);

    // Transfers table
    db.run(`
        CREATE TABLE IF NOT EXISTS transfers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount REAL NOT NULL,
            bank_details TEXT,
            status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
            created_at DATETIME DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // System Settings table for dynamic configurations (e.g., Bank Details)
    db.run(`
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    `, (err) => {
        if (!err) {
            // Seed default bank details if they don't exist
            db.get("SELECT COUNT(*) as count FROM settings WHERE key='bank_details'", (err, row) => {
                if (row && row.count === 0) {
                    const defaultBank = JSON.stringify({
                        bank: "Commercial Bank",
                        name: "CeylonTerrece",
                        account: "1234 5678 9012",
                        branch: "Colombo 01"
                    });
                    db.run("INSERT INTO settings (key, value) VALUES ('bank_details', ?)", [defaultBank]);
                }
            });
        }
    });

    // Ad Plans table
    db.run(`
        CREATE TABLE IF NOT EXISTS ad_plans (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            duration_days INTEGER NOT NULL,
            active INTEGER DEFAULT 1
        )
    `, (err) => {
        if (!err) {
            db.get("SELECT COUNT(*) as count FROM ad_plans", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO ad_plans (id, name, price, duration_days, active) VALUES (?, ?, ?, ?, ?)");
                    stmt.run('free_trial', 'Free Trial', 0, 30, 1);
                    stmt.run('weekly', 'Weekly Basic', 1500, 7, 1);
                    stmt.run('monthly', 'Monthly Pro', 6000, 30, 1);
                    stmt.run('yearly', 'Yearly Corporate', 48000, 365, 1);
                    stmt.finalize();
                }
            });
        }
    });

    // Sample data (for testing)
    db.get("SELECT COUNT(*) as count FROM properties", (err, row) => {
        if (row.count === 0) {
            const sampleProperties = [
                ['Modern House in Colombo 5', 'Beautiful 3 bedroom house with garden', 45000000, 'House', 'Sale', 3, 2, 12.5, 'Colombo 5', 'Colombo', 'Colombo', 'John Doe', '0771234567', 'john@email.com', '["house1.jpg","house2.jpg"]', 'active'],
                ['Land in Kandy', 'Prime land near Kandy city center', 15000000, 'Land', 'Sale', null, null, 25.0, 'Kandy', 'Kandy', 'Kandy', 'Jane Smith', '0777654321', 'jane@email.com', '["land1.jpg"]', 'active'],
                ['Apartment for Rent', '2 bedroom apartment in Nugegoda', 85000, 'Apartment', 'Rent', 2, 1, null, 'Nugegoda', 'Colombo', 'Colombo', 'Mike Wilson', '0781234567', 'mike@email.com', '["apt1.jpg"]', 'active']
            ];
            
            sampleProperties.forEach(prop => {
                db.run(`INSERT INTO properties (title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images, status) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, prop);
            });
        }
    });
    // Sample agents
    db.get("SELECT COUNT(*) as count FROM agents", (err, row) => {
        if (row && row.count === 0) {
             const sampleAgents = [
                ['Jane Doe', 'jane@ceylonterrece.com', '0771234567', '0771234567', 'https://ui-avatars.com/api/?name=Jane+Doe&background=2563eb&color=fff', 'LIC-001'],
                ['Kamal Perera', 'kamal@ceylonterrece.com', '0719876543', '0719876543', 'https://ui-avatars.com/api/?name=Kamal+Perera&background=10b981&color=fff', 'LIC-002']
            ];
            sampleAgents.forEach(agent => {
                db.run(`INSERT INTO agents (name, email, phone, whatsapp, photo, license_number) VALUES (?, ?, ?, ?, ?, ?)`, agent);
            });
        }
    });

    // Seed Admin User
    db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", async (err, row) => {
        if (row && row.count === 0) {
            const bcrypt = require('bcryptjs');
            const hashed = await bcrypt.hash('admin123', 10);
            db.run(`INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@ceylonterrece.com', ?, 'admin')`, [hashed]);
        }
    });
});

module.exports = db;
