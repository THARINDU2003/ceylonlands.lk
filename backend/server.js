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
        ? ['https://ceylonterrece.com', 'https://www.ceylonterrece.com']
        : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ 
    limit: '2mb',
    verify: (req, res, buf) => {
        if (req.originalUrl.startsWith('/api/paddle-webhook')) {
            req.rawBody = buf.toString('utf8');
        }
    }
}));
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
        if (req.user.role === 'admin') return next();
        
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

// Create new construction professional registration
app.post('/api/construction-professionals', (req, res) => {
    let { company_name, registration_number, location, category, phone, email, portfolio_link } = req.body;

    company_name = sanitizeText(company_name);
    
    if (!company_name || !phone || !category) {
        return res.status(400).json({ error: 'Company Name, Phone, and Category are required.' });
    }

    const sql = `INSERT INTO construction_professionals (company_name, registration_number, location, category, phone, email, portfolio_link, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
    
    db.run(sql, [company_name, registration_number, location, category, phone, email, portfolio_link], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, message: 'Construction Professional registered successfully' });
    });
});

// Get construction professionals
app.get('/api/construction-professionals', (req, res) => {
    const { category, location } = req.query;
    let sql = 'SELECT * FROM construction_professionals WHERE status = "active"';
    let params = [];

    if (category) {
        sql += ' AND category = ?';
        params.push(category);
    }
    if (location) {
        sql += ' AND location LIKE ?';
        params.push(`%${location}%`);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Create new property (Seller)
app.post('/api/properties', (req, res) => {
    let { title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images, status, ad_plan } = req.body;

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

    // Handle ad plan logic
    let propStatus = status === 'draft' ? 'draft' : 'pending';
    let expiryDateSql = "NULL";
    
    // Check ad_plans if a free trial is selected
    if (ad_plan === 'free_trial' && propStatus !== 'draft') {
        db.get("SELECT * FROM ad_plans WHERE id = 'free_trial'", (err, plan) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!plan || !plan.active) {
                return res.status(400).json({ error: 'Free trial is currently not available.' });
            }
            
            propStatus = 'active';
            expiryDateSql = `datetime('now', '+${plan.duration_days} days')`;
            
            insertProperty(propStatus, expiryDateSql);
        });
    } else {
        insertProperty(propStatus, expiryDateSql);
    }

    function insertProperty(finalStatus, finalExpiry) {
        const sql = `INSERT INTO properties (title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images, status, expiry_date, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${finalExpiry}, datetime('now'))`;
        
        db.run(sql, [title, description, price, property_type, offer_type, bedrooms, bathrooms, land_area, address, city, district, seller_name, seller_phone, seller_email, images, finalStatus], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: finalStatus === 'active' ? 'Property activated with Free Trial!' : 'Property added successfully' });
        });
    }
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

// ============= Paddle Webhook Route =============
const crypto = require('crypto');

app.post('/api/paddle-webhook', (req, res) => {
    const signatureHeader = req.headers['paddle-signature'];
    const secret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!signatureHeader || !secret || !req.rawBody) {
        return res.status(400).send('Missing signature or secret');
    }

    // Parse the Paddle-Signature header (format: ts=...,h1=...)
    const parts = signatureHeader.split(';');
    let ts = '', h1 = '';
    parts.forEach(part => {
        const [key, value] = part.split('=');
        if (key === 'ts') ts = value;
        if (key === 'h1') h1 = value;
    });

    if (!ts || !h1) {
        return res.status(400).send('Invalid signature format');
    }

    // Recreate the payload to hash
    const signedPayload = `${ts}:${req.rawBody}`;
    const generatedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

    if (generatedSignature !== h1) {
        console.error('Paddle webhook signature verification failed.');
        return res.status(401).send('Invalid signature');
    }

    // Signature verified! Process the event
    let eventData;
    try {
        eventData = JSON.parse(req.rawBody);
    } catch (e) {
        return res.status(400).send('Invalid JSON body');
    }

    console.log(`Received Paddle Event: ${eventData.event_type}`);

    // Handle completed transaction
    if (eventData.event_type === 'transaction.completed') {
        const transaction = eventData.data;
        // The propertyId should be passed during checkout initialization in customData
        const propertyId = transaction.custom_data ? transaction.custom_data.property_id : null;
        
        // Example: items[0].price.id gives the Paddle Price ID
        const priceId = transaction.items && transaction.items.length > 0 ? transaction.items[0].price.id : null;

        if (propertyId && priceId) {
            console.log(`Payment successful for Price ID: ${priceId}, Property ID: ${propertyId}`);

            // Calculate expiry date based on the plan (Price ID mapping)
            let daysToAdd = 7; // default 7 days for Weekly Basic
            
            // Note: you can map the specific Price IDs from the frontend to durations here
            if (priceId === 'pri_monthly_placeholder') daysToAdd = 30;
            if (priceId === 'pri_yearly_placeholder') daysToAdd = 365;

            // Date calculation in JS/SQLite
            const sql = `UPDATE properties SET status = 'active', expiry_date = datetime('now', '+${daysToAdd} days') WHERE id = ?`;
            db.run(sql, [propertyId], function(err) {
                if (err) {
                    console.error('Failed to update property status:', err.message);
                } else {
                    console.log(`Property ${propertyId} activated until ${daysToAdd} days from now.`);
                }
            });
        }
    }

    // Return a 200 OK so Paddle knows we received it
    res.status(200).send('Webhook processed successfully');
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
    if (req.user.role !== 'admin') {
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
    if (req.user.role !== 'admin') {
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
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only Super Admin can update company bank details' });
    }
    const { bank, name, account, branch } = req.body;
    const value = JSON.stringify({ bank, name, account, branch });

    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('bank_details', ?)", [value], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Bank details updated successfully' });
    });
});

// ============= Real Estate Agents Routes =============

// Get all agents (public)
app.get('/api/agents', (req, res) => {
    db.all('SELECT * FROM agents ORDER BY name ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Add completely new real estate agent
app.post('/api/admin/agents', verifyAdmin, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only Super Admin can manage agents' });
    }

    const { name, email, phone, whatsapp, photo, license_number } = req.body;
    if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone number are absolutely required' });
    }
    
    // Security sanitization
    const cleanName = sanitizeText(name);
    
    const sql = `INSERT INTO agents (name, email, phone, whatsapp, photo, license_number) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [cleanName, email, phone, whatsapp, photo || '', license_number || ''], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, message: 'Agent created successfully!' });
    });
});

// Admin: Delete a real estate agent
app.delete('/api/admin/agents/:id', verifyAdmin, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only Super Admin can delete agents' });
    }

    const sql = 'DELETE FROM agents WHERE id = ?';
    db.run(sql, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Agent fired/deleted successfully!' });
    });
});

// ============= Ad Plans Routes =============

// Get all ad plans (public)
app.get('/api/ad-plans', (req, res) => {
    db.all('SELECT * FROM ad_plans ORDER BY price ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Admin: Update ad plan pricing and duration
app.put('/api/admin/ad-plans/:id', verifyAdmin, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only Super Admin can manage ad plans' });
    }

    const { price, duration_days, active } = req.body;
    if (price === undefined || duration_days === undefined) {
        return res.status(400).json({ error: 'Price and duration are required' });
    }

    let sql, params;
    if (active !== undefined) {
        sql = `UPDATE ad_plans SET price = ?, duration_days = ?, active = ? WHERE id = ?`;
        params = [price, duration_days, active ? 1 : 0, req.params.id];
    } else {
        sql = `UPDATE ad_plans SET price = ?, duration_days = ? WHERE id = ?`;
        params = [price, duration_days, req.params.id];
    }

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Ad plan not found' });
        res.json({ message: 'Ad plan updated successfully!' });
    });
});

// Admin: Toggle ad plan active status (e.g., Free plan)
app.put('/api/admin/ad-plans/:id/toggle', verifyAdmin, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only Super Admin can toggle ad plans' });
    }

    const { active } = req.body;
    if (active === undefined) {
        return res.status(400).json({ error: 'Active status is required' });
    }

    const sql = `UPDATE ad_plans SET active = ? WHERE id = ?`;
    db.run(sql, [active ? 1 : 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Ad plan not found' });
        res.json({ message: 'Ad plan status toggled successfully!' });
    });
});

// ============= PayHere Integration Route =============
app.post('/api/payhere/hash', (req, res) => {
    const crypto = require('crypto');
    const { order_id, amount, currency } = req.body;
    
    // Replace these with environment variables in production
    const merchant_id = "1235652";
    const merchant_secret = "MzE4MTc3MTQ2NjQyNDMzODkwMDMxNjAwODM1OTk3MTkzOTEwNjQ5MA==";

    if (!order_id || !amount || !currency) {
        return res.status(400).json({ error: 'order_id, amount, and currency are required' });
    }

    // Amount must be formatted to two decimal places
    const formattedAmount = parseFloat(amount).toLocaleString('en-us', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, '');

    const md5Sig = crypto.createHash('md5').update(merchant_secret).digest('hex').toUpperCase();
    const hashData = merchant_id + order_id + formattedAmount + currency + md5Sig;
    const hash = crypto.createHash('md5').update(hashData).digest('hex').toUpperCase();

    res.json({ hash: hash, merchant_id: merchant_id });
});

// ============= AI Agent Route =============
app.post('/api/ai/chat', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'AI API Key not configured' });

        // Build the request for Google Gemini REST API
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const systemPrompt = "You are Terra, the friendly AI real estate assistant for CeylonTerrece.com (Sri Lanka). Keep answers under 3 sentences, be polite, and guide them to use our search filters.";
        
        // Dynamic import to use node-fetch if global fetch is not available (Node < 18)
        let fetchFn = global.fetch;
        if (!fetchFn) {
            const nodeFetch = await import('node-fetch');
            fetchFn = nodeFetch.default;
        }

        const response = await fetchFn(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\nUser: ${message}` }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return res.status(500).json({ error: 'AI is currently unavailable.' });
        }

        const aiText = data.candidates[0].content.parts[0].text;
        res.json({ reply: aiText });
    } catch (e) {
        console.error('AI Route Error:', e);
        res.status(500).json({ error: 'Failed to process AI request.' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}/`);
});
