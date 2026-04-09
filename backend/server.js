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
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ============= Auth Routes =============

// User Registration
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (name, email, password) VALUES (?, ?, ?)`;
        
        db.run(sql, [name, email, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User registered successfully', userId: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Admin Setup
app.post('/api/auth/setup-admin', async (req, res) => {
    const { name, email, password } = req.body;
    
    // Check if an admin already exists
    db.get(`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`, async (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row.count > 0) return res.status(403).json({ error: 'Admin account already exists.' });
        
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const sql = `INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')`;
            
            db.run(sql, [name, email, hashedPassword], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Admin setup successfully', userId: this.lastID });
            });
        } catch (err) {
            res.status(500).json({ error: 'Setup failed' });
        }
    });
});

// User Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const sql = `SELECT * FROM users WHERE email = ?`;
    db.get(sql, [email], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        
        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    });
});

// Middleware: Verify Admin
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        req.user = decoded;
        next();
    });
};

// ============= API Routes =============

// Get all public properties
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
    const { title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images, status } = req.body;
    
    // Use the provided status or default to 'pending'
    const propStatus = status === 'draft' ? 'draft' : 'pending';

    const sql = `INSERT INTO properties (title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images, status, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
    
    db.run(sql, [title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images, propStatus], function(err) {
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

// Admin: Get all properties (including pending/drafts)
app.get('/api/admin/properties', verifyAdmin, (req, res) => {
    let sql = 'SELECT * FROM properties ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Manage properties (Approve/Delete)
app.put('/api/admin/properties/:id/status', verifyAdmin, (req, res) => {
    const { status } = req.body;
    if (!['active', 'deleted'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }
    
    const sql = `UPDATE properties SET status = ? WHERE id = ?`;
    db.run(sql, [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Property not found' });
        res.json({ message: 'Property status updated' });
    });
});

// Admin: Get Dashboard Stats
app.get('/api/dashboard-stats', verifyAdmin, (req, res) => {
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
