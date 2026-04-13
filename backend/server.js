const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============= SECURITY PACKAGES =============
let helmet, rateLimit, xssClean;
try { helmet = require('helmet'); } catch(e) { console.warn('helmet not installed'); }
try { rateLimit = require('express-rate-limit'); } catch(e) { console.warn('express-rate-limit not installed'); }
try { xssClean = require('xss-clean'); } catch(e) { console.warn('xss-clean not installed'); }

// 1. Helmet: Sets secure HTTP headers (XSS, clickjacking, etc.)
if (helmet) {
    app.use(helmet({
        contentSecurityPolicy: false // Allow inline scripts/styles for existing pages
    }));
}

// 2. XSS Clean: Sanitize all req.body, req.params, req.query
if (xssClean) app.use(xssClean());

// 3. Rate Limiters
if (rateLimit) {
    // Auth route limiter: max 10 login/register attempts per 15 min per IP
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: { error: 'Too many attempts. Please try again in 15 minutes.' },
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use('/api/auth/', authLimiter);

    // General API limiter: max 200 requests per 15 min per IP
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        message: { error: 'Too many requests. Please slow down.' },
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use('/api/', apiLimiter);
}

// ============= SECURITY UTILITY FUNCTIONS =============

// URL/Link pattern detector (http, https, www., ftp, .lk, .com shortcuts, etc.)
const urlPattern = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\bwww\.[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])|(\b\S+\.(com|lk|net|org|io|co|info|biz|me)\b)/gi;

function containsLink(text) {
    if (!text || typeof text !== 'string') return false;
    return urlPattern.test(text);
}

function sanitizeText(text) {
    if (!text || typeof text !== 'string') return text;
    // Strip HTML tags
    return text.replace(/<[^>]*>/g, '').trim();
}

// ============= MIDDLEWARE =============
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://ceylonterrace.com', 'https://www.ceylonterrace.com']
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// Database connection
const db = require('./database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_change_this_in_production';

// ============= Auth Routes =============

// User Registration
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, account_type, company_name } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (name, email, password, account_type, company_name) VALUES (?, ?, ?, ?, ?)`;
        
        db.run(sql, [name, email, hashedPassword, account_type || 'personal', company_name || null], function(err) {
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
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                permissions: JSON.parse(user.permissions || '[]')
            }
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
        
        // Fetch full user to check dynamic permissions
        db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, user) => {
            if (err || !user) return res.status(401).json({ error: 'User not found' });
            req.user = user;
            req.user.permissions = JSON.parse(user.permissions || '[]');
            next();
        });
    });
};

// Middleware: Check Specific Permission
const checkPermission = (permission) => {
    return (req, res, next) => {
        // Super admin (main admin) has all permissions implicitly
        if (req.user.email === 'admin@ceylonterrace.com') return next();
        
        if (req.user.permissions.includes(permission)) {
            next();
        } else {
            res.status(403).json({ error: `Permission Denied: Missing ${permission}` });
        }
    };
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
    let { title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images, status } = req.body;

    // --- SECURITY: Strip HTML from all text fields ---
    title = sanitizeText(title);
    description = sanitizeText(description);
    address = sanitizeText(address);
    seller_name = sanitizeText(seller_name);

    // --- SECURITY: Block URLs/links in property content ---
    const fieldsToCheck = { title, description, address };
    for (const [field, value] of Object.entries(fieldsToCheck)) {
        if (containsLink(value)) {
            return res.status(400).json({ error: `Links are not allowed in the "${field}" field. Please remove any website addresses or URLs.` });
        }
    }

    // --- SECURITY: Validate price is a positive number ---
    if (isNaN(price) || price <= 0) {
        return res.status(400).json({ error: 'Invalid price value.' });
    }

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
    let { property_id, name, phone, email, message } = req.body;

    // --- SECURITY: Strip HTML ---
    name = sanitizeText(name);
    message = sanitizeText(message);

    // --- SECURITY: Block links in messages ---
    if (containsLink(message)) {
        return res.status(400).json({ error: 'Links and website addresses are not allowed in messages. Please contact us directly.' });
    }
    if (containsLink(name)) {
        return res.status(400).json({ error: 'Invalid name. Please use your real name.' });
    }

    // --- SECURITY: Basic field validation ---
    if (!name || !phone || !message) {
        return res.status(400).json({ error: 'Name, phone, and message are required.' });
    }
    if (message.length > 1000) {
        return res.status(400).json({ error: 'Message is too long (max 1000 characters).' });
    }
    
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

// ============= Super Admin Routes (Full Control) =============

// Admin: Get all users
app.get('/api/admin/users', verifyAdmin, (req, res) => {
    const sql = 'SELECT id, name, email, role, account_type, company_name, created_at FROM users ORDER BY created_at DESC';
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Update user role
app.put('/api/admin/users/:id/role', verifyAdmin, (req, res) => {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
    }
    const sql = 'UPDATE users SET role = ? WHERE id = ?';
    db.run(sql, [role, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User role updated' });
    });
});

// Admin: Delete user
app.delete('/api/admin/users/:id', verifyAdmin, (req, res) => {
    const sql = 'DELETE FROM users WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'User deleted' });
    });
});

// Admin: Get all inquiries
app.get('/api/admin/inquiries', verifyAdmin, (req, res) => {
    const sql = `
        SELECT i.*, p.title as property_title 
        FROM inquiries i 
        LEFT JOIN properties p ON i.property_id = p.id 
        ORDER BY i.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Delete inquiry
app.delete('/api/admin/inquiries/:id', verifyAdmin, (req, res) => {
    const sql = 'DELETE FROM inquiries WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Inquiry deleted' });
    });
});

// Admin: Full Property Edit
app.put('/api/admin/properties/:id', verifyAdmin, (req, res) => {
    const { title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, status } = req.body;
    const sql = `
        UPDATE properties SET 
        title = ?, description = ?, price = ?, property_type = ?, offer_type = ?, 
        bedrooms = ?, bathrooms = ?, land_area = ?, address = ?, city = ?, district = ?, status = ?
        WHERE id = ?
    `;
    const params = [title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, status, req.params.id];
    
    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Property updated successfully' });
    });
});

// Admin: Delete Property Permanently
app.delete('/api/admin/properties/:id', verifyAdmin, checkPermission('edit_all'), (req, res) => {
    const sql = 'DELETE FROM properties WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Property deleted permanently' });
    });
});

// Admin: Create Staff Account
app.post('/api/admin/staff', verifyAdmin, async (req, res) => {
    // Only the main super admin can create staff
    if (req.user.email !== 'admin@ceylonterrace.com') {
        return res.status(403).json({ error: 'Only Super Admin can create staff accounts' });
    }

    const { name, email, password, permissions } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const sql = `INSERT INTO users (name, email, password, role, permissions) VALUES (?, ?, ?, 'admin', ?)`;
        db.run(sql, [name, email, hashedPassword, JSON.stringify(permissions)], function(err) {
            if (err) return res.status(400).json({ error: 'Email exists or invalid data' });
            res.status(201).json({ message: 'Staff account created successfully' });
        });
    } catch (e) { res.status(500).json({ error: 'Failed to create staff' }); }
});

// Admin: Balance & Transfers
app.get('/api/admin/system-balance', verifyAdmin, (req, res) => {
    // Everyone can see total balance
    db.get('SELECT SUM(balance) as total FROM users', (err, row) => {
        res.json({ balance: row.total || 0 });
    });
});

app.post('/api/admin/transfers', verifyAdmin, (req, res) => {
    // RESTRICTED: Only the main super admin can trigger bank transfers
    if (req.user.email !== 'admin@ceylonterrace.com') {
        return res.status(403).json({ error: 'Restricted: Only Super Admin can process bank transfers' });
    }

    const { amount, bank_details } = req.body;
    const sql = `INSERT INTO transfers (user_id, amount, bank_details) VALUES (?, ?, ?)`;
    db.run(sql, [req.user.id, amount, bank_details], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: 'Transfer request recorded' });
    });
});

app.get('/api/admin/transfers', verifyAdmin, (req, res) => {
    db.all('SELECT * FROM transfers ORDER BY created_at DESC', (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Manage Public Bank Details
app.get('/api/settings/bank', (req, res) => {
    db.get("SELECT value FROM settings WHERE key='bank_details'", (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Not found' });
        res.json(JSON.parse(row.value));
    });
});

app.post('/api/admin/settings/bank', verifyAdmin, (req, res) => {
    if (req.user.email !== 'admin@ceylonterrace.com') {
        return res.status(403).json({ error: 'Only Super Admin can update company bank details' });
    }
    const { bank, name, account, branch } = req.body;
    const value = JSON.stringify({ bank, name, account, branch });

    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('bank_details', ?)", [value], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Bank details updated successfully' });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}/`);
});
