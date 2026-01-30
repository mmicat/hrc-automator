require('dotenv').config(); 
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');

// 1. Initialize the app
const app = express();

app.set('trust proxy', 1); // Trust Vercel's proxy
// 2. Configure Session Middleware (before routes)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    // If this is true but Vercel's proxy isn't trusted, 
    // the browser will REJECT the login cookie.
    secure: process.env.NODE_ENV === 'production', 
    maxAge: 1000 * 60 * 60 * 24 
  }
}));

// 3. Body Parsing & Static Files
app.use(express.json());
app.use(express.static('public')); 

// 4. Custom Authentication Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized. Please log in." });
};

// --- ROUTES ---

// Login Route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
        if (rows.length === 0) return res.status(401).json({ error: "Invalid username or password" });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            req.session.user = { id: user.user_id, username: user.username };
            res.json({ message: "Login successful" });
        } else {
            res.status(401).json({ error: "Invalid username or password" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logout Route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: "Logged out" });
});

// Protected Route: Create Job Card
app.post('/create-job-card', isAuthenticated, async (req, res) => {
    const { 
        full_name, phone_no, oil_card_no, 
        vin_no, make, model, year, color, reg_no, 
        date_in, mileage 
    } = req.body;

    try {
        const finalDate = date_in || new Date().toISOString().split('T')[0];

        const [existingClients] = await db.query("SELECT customer_id FROM clients WHERE phone_no = ?", [phone_no]);
        let customerId;

        if (existingClients.length > 0) {
            customerId = existingClients[0].customer_id;
        } else {
            const [newClient] = await db.query(
                "INSERT INTO clients (full_name, phone_no, oil_card_no) VALUES (?, ?, ?)",
                [full_name, phone_no, oil_card_no]
            );
            customerId = newClient.insertId;
        }

        const [existingVehicles] = await db.query("SELECT vin_no FROM vehicles WHERE vin_no = ?", [vin_no]);
        if (existingVehicles.length === 0) {
            await db.query(
                "INSERT INTO vehicles (vin_no, make, model, year, color, reg_no, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [vin_no, make, model, year, color, reg_no, customerId]
            );
        }

        const [dbResult] = await db.query(
            "INSERT INTO job_cards (date_in, mileage, vin_no, customer_id) VALUES (?, ?, ?, ?)",
            [finalDate, mileage, vin_no, customerId]
        );

        res.status(201).json({ message: "Success!", job_no: dbResult.insertId, status: "Job Card Created" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/next-job-no', isAuthenticated, async (req, res) => {
    try {
        // Find the maximum job number currently in the table
        const [rows] = await db.query("SELECT MAX(job_no) as maxId FROM job_cards");
        
        // If the table is empty, start at 1091
        // Otherwise, add 1 to the highest number found
        const nextId = rows[0].maxId ? parseInt(rows[0].maxId) + 1 : 1091;
        
        res.json({ nextId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected Route: Search Client
app.get('/search-client/:phone', isAuthenticated, async (req, res) => {
    try {
        const phone = req.params.phone;
        const [results] = await db.query(`
            SELECT c.*, v.* FROM clients c
            LEFT JOIN vehicles v ON c.customer_id = v.customer_id
            WHERE c.phone_no = ?
        `, [phone]);

        if (results.length > 0) res.json(results[0]);
        else res.status(404).json({ message: "No client found" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Protected Route: Dashboard List
app.get('/all-clients', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.customer_id, c.full_name, c.phone_no, v.make, v.model, v.reg_no 
            FROM clients c
            LEFT JOIN vehicles v ON c.customer_id = v.customer_id
            ORDER BY c.full_name ASC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 HRC Automator running on http://localhost:${PORT}`);
});

module.exports = app;