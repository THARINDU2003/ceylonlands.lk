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
});

module.exports = db;
