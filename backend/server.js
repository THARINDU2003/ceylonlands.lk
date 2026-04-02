const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
const db = require('./database');

// ============= API Routes =============

// Get all properties
app.get('/api/properties', (req, res) => {
    const { type, minPrice, maxPrice, location, bedrooms } = req.query;
    let sql = 'SELECT * FROM properties WHERE status = "active"';
    let params = [];

    if (type) {
        sql += ' AND property_type = ?';
        params.push(type);
    }
    if (minPrice) {
        sql += ' AND price >= ?';
        params.push(minPrice);
    }
    if (maxPrice) {
        sql += ' AND price <= ?';
        params.push(maxPrice);
    }
    if (location) {
        sql += ' AND (city LIKE ? OR district LIKE ?)';
        params.push(`%${location}%`, `%${location}%`);
    }
    if (bedrooms) {
        sql += ' AND bedrooms >= ?';
        params.push(bedrooms);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single property by ID
app.get('/api/properties/:id', (req, res) => {
    const sql = 'SELECT * FROM properties WHERE id = ?';
    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

// Create new property (Seller)
app.post('/api/properties', (req, res) => {
    const { title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images } = req.body;
    
    const sql = `INSERT INTO properties (title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images, status, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`;
    
    db.run(sql, [title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Property added successfully' });
    });
});

// Contact seller (send inquiry)
app.post('/api/inquiries', (req, res) => {
    const { property_id, name, phone, email, message } = req.body;
    
    const sql = `INSERT INTO inquiries (property_id, name, phone, email, message, created_at) 
                 VALUES (?, ?, ?, ?, ?, datetime('now'))`;
    
    db.run(sql, [property_id, name, phone, email, message], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Inquiry sent successfully' });
    });
});

// Get featured properties
app.get('/api/featured', (req, res) => {
    const sql = 'SELECT * FROM properties WHERE status = "active" ORDER BY views DESC LIMIT 6';
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Dashboard Statistics (for Admin)
app.get('/api/dashboard-stats', (req, res) => {
    const stats = {};
    
    // Total Properties & Total Value
    db.get('SELECT COUNT(*) as count, SUM(price) as totalValue FROM properties', (err, total) => {
        if (err) return res.status(500).json({ error: err.message });
        stats.total = total;

        // Sale Properties
        db.get('SELECT COUNT(*) as count, SUM(price) as totalValue FROM properties WHERE offer_type = "Sale"', (err, sale) => {
            if (err) return res.status(500).json({ error: err.message });
            stats.sale = sale;

            // Rent Properties
            db.get('SELECT COUNT(*) as count, SUM(price) as totalValue FROM properties WHERE offer_type = "Rent"', (err, rent) => {
                if (err) return res.status(500).json({ error: err.message });
                stats.rent = rent;

                // Recent Properties (New List)
                db.all('SELECT * FROM properties ORDER BY created_at DESC LIMIT 3', (err, recent) => {
                    if (err) return res.status(500).json({ error: err.message });
                    stats.recent = recent;

                    // Monthly Data (for charts)
                    db.all(`SELECT strftime('%m', created_at) as month, COUNT(*) as count 
                            FROM properties 
                            GROUP BY month 
                            ORDER BY month ASC 
                            LIMIT 12`, (err, monthly) => {
                        if (err) return res.status(500).json({ error: err.message });
                        stats.monthlyData = monthly;
                        res.json(stats);
                    });
                });
            });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}/`);
});
