require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();

// Initialize DB
(async function initDB() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                invoice_no INT AUTO_INCREMENT PRIMARY KEY,
                job_no INT,
                invoice_date DATE,
                subtotal DECIMAL(10,2) DEFAULT 0,
                vat_applied BOOLEAN DEFAULT FALSE,
                grand_total DECIMAL(10,2) DEFAULT 0
            )
        `);

        try {
            await db.query("ALTER TABLE invoices ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0");
            await db.query("ALTER TABLE invoices ADD COLUMN vat_applied BOOLEAN DEFAULT FALSE");
            await db.query("ALTER TABLE invoices ADD COLUMN grand_total DECIMAL(10,2) DEFAULT 0");
        } catch(e) {}

        await db.query(`
            CREATE TABLE IF NOT EXISTS invoice_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_no INT,
                order_no INT,
                description VARCHAR(255),
                quantity INT DEFAULT 1,
                unit_price DECIMAL(10,2) DEFAULT 0,
                discount DECIMAL(5,2) DEFAULT 0,
                total DECIMAL(10,2) DEFAULT 0,
                FOREIGN KEY (invoice_no) REFERENCES invoices(invoice_no) ON DELETE CASCADE
            )
        `);
        const [rows] = await db.query("SELECT COUNT(*) AS count FROM invoices");
        if (rows[0].count === 0) {
            await db.query("ALTER TABLE invoices AUTO_INCREMENT = 3001"); 
        }

        // Fix AUTO_INCREMENT for Job Cards on startup
        const [jcRows] = await db.query("SELECT MAX(job_no) as maxId FROM job_cards");
        const nextJcId = jcRows[0].maxId ? parseInt(jcRows[0].maxId) + 1 : 1091;
        await db.query(`ALTER TABLE job_cards AUTO_INCREMENT = ${nextJcId}`);

    } catch(e) {
        console.error("DB Init Error:", e);
    }
})();

// CORS configuration
app.use(
  cors({
    origin: ["http://localhost:3000", "https://hrc-automator.vercel.app"],
    credentials: true
  })
);

app.set('trust proxy', 1);

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    res.status(401).json({ error: "Unauthorized. Please log in." });
};

// === ROUTES ===

// Health check (no auth)
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'API is working!'
    });
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
    }

    try {
        const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            req.session.user = { id: user.user_id, username: user.username };
            return res.json({ message: "Login successful" });
        } else {
            return res.status(401).json({ error: "Invalid username or password" });
        }
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: "Database error" });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.json({ message: "Logged out" });
    });
});

// Create Job Card
app.post('/api/create-job-card', isAuthenticated, async (req, res) => {
    const { 
        full_name, phone_no, oil_card_no, 
        vin_no, make, model, year, color, reg_no, 
        date_in, mileage 
    } = req.body;

    try {
        const finalDate = date_in || new Date().toISOString().split('T')[0];

        const [existingClients] = await db.query(
            "SELECT customer_id FROM clients WHERE phone_no = ?", 
            [phone_no]
        );
        
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

        const [existingVehicles] = await db.query(
            "SELECT vin_no FROM vehicles WHERE vin_no = ?", 
            [vin_no]
        );
        
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

        res.status(201).json({ 
            message: "Success!", 
            job_no: dbResult.insertId, 
            status: "Job Card Created" 
        });
    } catch (error) {
        console.error('Create job card error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add Customer / Vehicle Record (Without Job Card)
app.post('/api/add-customer-record', isAuthenticated, async (req, res) => {
    const { 
        full_name, phone_no, oil_card_no, 
        vin_no, make, model, year, color, reg_no 
    } = req.body;

    try {
        const [existingClients] = await db.query(
            "SELECT customer_id FROM clients WHERE phone_no = ?", 
            [phone_no]
        );
        
        let customerId;

        // 1. Handle Client Creation
        if (existingClients.length > 0) {
            customerId = existingClients[0].customer_id;
            // Optionally, we could update the client details, but for now we'll just use the ID.
        } else {
            const [newClient] = await db.query(
                "INSERT INTO clients (full_name, phone_no, oil_card_no) VALUES (?, ?, ?)",
                [full_name, phone_no, oil_card_no]
            );
            customerId = newClient.insertId;
        }

        // 2. Handle Vehicle Creation (if vin_no provided)
        if (vin_no) {
            const [existingVehicles] = await db.query(
                "SELECT vin_no FROM vehicles WHERE vin_no = ?", 
                [vin_no]
            );
            
            if (existingVehicles.length === 0) {
                await db.query(
                    "INSERT INTO vehicles (vin_no, make, model, year, color, reg_no, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [vin_no, make, model, year, color, reg_no, customerId]
                );
            }
        }

        res.status(201).json({ 
            message: "Record successfully added!", 
            status: "Customer/Vehicle Created" 
        });
    } catch (error) {
        console.error('Create customer/vehicle error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Job Card
app.get('/api/job-card/:job_no', isAuthenticated, async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT j.job_no, j.date_in, j.mileage, 
                   c.customer_id, c.full_name, c.phone_no, c.oil_card_no, 
                   v.vin_no, v.make, v.model, v.year, v.color, v.reg_no
            FROM job_cards j
            LEFT JOIN clients c ON j.customer_id = c.customer_id
            LEFT JOIN vehicles v ON j.vin_no = v.vin_no
            WHERE j.job_no = ?
        `, [req.params.job_no]);

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ message: "Job Card not found" });
        }
    } catch (error) {
        console.error('Fetch job card error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Last Job Card
app.get('/api/last-job-card', isAuthenticated, async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT j.job_no, j.date_in, j.mileage, 
                   c.customer_id, c.full_name, c.phone_no, c.oil_card_no, 
                   v.vin_no, v.make, v.model, v.year, v.color, v.reg_no
            FROM job_cards j
            LEFT JOIN clients c ON j.customer_id = c.customer_id
            LEFT JOIN vehicles v ON j.vin_no = v.vin_no
            ORDER BY j.job_no DESC LIMIT 1
        `);

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ message: "No job cards found" });
        }
    } catch (error) {
        console.error('Fetch last job card error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Job Card
app.delete('/api/delete-job-card/:job_no', isAuthenticated, async (req, res) => {
    try {
        await db.query("DELETE FROM job_cards WHERE job_no = ?", [req.params.job_no]);
        
        // Push AUTO_INCREMENT back to the true highest number + 1
        const [jcRows] = await db.query("SELECT MAX(job_no) as maxId FROM job_cards");
        const nextJcId = jcRows[0].maxId ? parseInt(jcRows[0].maxId) + 1 : 1091;
        await db.query(`ALTER TABLE job_cards AUTO_INCREMENT = ${nextJcId}`);
        
        res.json({ message: "Job card deleted successfully" });
    } catch (error) {
        console.error('Delete job card error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Overwrite Job Card
app.put('/api/update-job-card/:job_no', isAuthenticated, async (req, res) => {
    const jobNo = req.params.job_no;
    const { 
        full_name, phone_no, oil_card_no, 
        vin_no, make, model, year, color, reg_no, 
        date_in, mileage 
    } = req.body;

    try {
        const finalDate = date_in || new Date().toISOString().split('T')[0];

        // 1. Resolve Client
        const [existingClients] = await db.query(
            "SELECT customer_id FROM clients WHERE phone_no = ?", 
            [phone_no]
        );
        
        let customerId;
        if (existingClients.length > 0) {
            customerId = existingClients[0].customer_id;
            // Does not mutate the old/existing client's name or oil card, 
            // strictly linking to them (or a completely new one)!
        } else {
            const [newClient] = await db.query(
                "INSERT INTO clients (full_name, phone_no, oil_card_no) VALUES (?, ?, ?)",
                [full_name, phone_no, oil_card_no]
            );
            customerId = newClient.insertId;
        }

        // 2. Resolve Vehicle
        if (vin_no) {
            const [existingVehicles] = await db.query(
                "SELECT vin_no FROM vehicles WHERE vin_no = ?", 
                [vin_no]
            );
            
            if (existingVehicles.length === 0) {
                await db.query(
                    "INSERT INTO vehicles (vin_no, make, model, year, color, reg_no, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [vin_no, make, model, year, color, reg_no, customerId]
                );
            }
        }

        // 3. Re-link Date, Mileage, Client, and Vehicle on Job Card
        await db.query(
            "UPDATE job_cards SET date_in = ?, mileage = ?, vin_no = ?, customer_id = ? WHERE job_no = ?",
            [finalDate, mileage, vin_no, customerId, jobNo]
        );

        res.json({ message: "Job Card updated successfully", job_no: jobNo });
    } catch (error) {
        console.error('Update job card error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get next job number
app.get('/api/next-job-no', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT MAX(job_no) as maxId FROM job_cards");
        const nextId = rows[0].maxId ? parseInt(rows[0].maxId) + 1 : 1091;
        res.json({ nextId });
    } catch (error) {
        console.error('Next job number error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- INVOICE ROUTES ---

// Get all job cards
app.get('/api/all-job-cards', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT j.job_no, j.date_in, j.mileage, 
                   c.full_name, c.phone_no, 
                   v.make, v.model, v.year, v.color, v.reg_no, v.vin_no
            FROM job_cards j
            LEFT JOIN clients c ON j.customer_id = c.customer_id
            LEFT JOIN vehicles v ON j.vin_no = v.vin_no
            ORDER BY j.job_no DESC
        `);
        res.json(rows);
    } catch (error) {
        console.error('All job cards error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get next invoice number
app.get('/api/next-invoice-no', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT MAX(invoice_no) as maxId FROM invoices");
        const nextId = rows[0].maxId ? parseInt(rows[0].maxId) + 1 : 3001;
        res.json({ nextId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create Invoice
app.post('/api/create-invoice', isAuthenticated, async (req, res) => {
    const { job_no, invoice_date, subtotal, vat_applied, grand_total, items } = req.body;
    try {
        const finalDate = invoice_date || new Date().toISOString().split('T')[0];
        const [dbResult] = await db.query(
            "INSERT INTO invoices (job_no, invoice_date, subtotal, vat_applied, grand_total) VALUES (?, ?, ?, ?, ?)",
            [job_no, finalDate, subtotal || 0, vat_applied ? 1 : 0, grand_total || 0]
        );
        const invNo = dbResult.insertId;

        if (items && Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                await db.query(
                    "INSERT INTO invoice_items (invoice_no, order_no, description, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [invNo, item.order_no, item.description, item.quantity, item.unit_price, item.discount, item.total]
                );
            }
        }

        res.status(201).json({ 
            message: "Invoice Created!", 
            invoice_no: invNo
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get existing Invoice
app.get('/api/invoice/:invoice_no', isAuthenticated, async (req, res) => {
    try {
        const [invResults] = await db.query(`
            SELECT i.*, j.mileage, j.date_in,
                   c.full_name, c.phone_no, 
                   v.make, v.model, v.year, v.color, v.reg_no, v.vin_no
            FROM invoices i
            JOIN job_cards j ON i.job_no = j.job_no
            LEFT JOIN clients c ON j.customer_id = c.customer_id
            LEFT JOIN vehicles v ON j.vin_no = v.vin_no
            WHERE i.invoice_no = ?
        `, [req.params.invoice_no]);

        if (invResults.length === 0) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        const invoice = invResults[0];
        
        const [items] = await db.query("SELECT * FROM invoice_items WHERE invoice_no = ? ORDER BY order_no ASC", [req.params.invoice_no]);
        invoice.items = items;
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Invoice
app.put('/api/update-invoice/:invoice_no', isAuthenticated, async (req, res) => {
    const invNo = req.params.invoice_no;
    const { subtotal, vat_applied, grand_total, items } = req.body;
    
    try {
        await db.query(
            "UPDATE invoices SET subtotal = ?, vat_applied = ?, grand_total = ? WHERE invoice_no = ?",
            [subtotal || 0, vat_applied ? 1 : 0, grand_total || 0, invNo]
        );

        await db.query("DELETE FROM invoice_items WHERE invoice_no = ?", [invNo]);

        if (items && Array.isArray(items) && items.length > 0) {
            for (const item of items) {
                await db.query(
                    "INSERT INTO invoice_items (invoice_no, order_no, description, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [invNo, item.order_no, item.description, item.quantity, item.unit_price, item.discount, item.total]
                );
            }
        }

        res.json({ message: "Invoice updated successfully", invoice_no: invNo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all invoices (list view)
app.get('/api/all-invoices', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT i.invoice_no, i.invoice_date, i.subtotal, i.vat_applied, i.grand_total,
                   c.full_name, c.phone_no,
                   v.make, v.model, v.reg_no,
                   j.job_no
            FROM invoices i
            LEFT JOIN job_cards j ON i.job_no = j.job_no
            LEFT JOIN clients c ON j.customer_id = c.customer_id
            LEFT JOIN vehicles v ON j.vin_no = v.vin_no
            ORDER BY i.invoice_no DESC
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get last invoice (for safe-delete confirmation)
app.get('/api/last-invoice', isAuthenticated, async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT i.invoice_no, i.invoice_date, i.grand_total,
                   c.full_name, v.make, v.model
            FROM invoices i
            LEFT JOIN job_cards j ON i.job_no = j.job_no
            LEFT JOIN clients c ON j.customer_id = c.customer_id
            LEFT JOIN vehicles v ON j.vin_no = v.vin_no
            ORDER BY i.invoice_no DESC LIMIT 1
        `);
        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ message: "No invoices found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete invoice (cascade deletes items via FK)
app.delete('/api/delete-invoice/:invoice_no', isAuthenticated, async (req, res) => {
    try {
        await db.query("DELETE FROM invoices WHERE invoice_no = ?", [req.params.invoice_no]);

        // Reset AUTO_INCREMENT to match the true next invoice number
        const [rows] = await db.query("SELECT MAX(invoice_no) as maxId FROM invoices");
        const nextId = rows[0].maxId ? parseInt(rows[0].maxId) + 1 : 3001;
        await db.query(`ALTER TABLE invoices AUTO_INCREMENT = ${nextId}`);

        res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search Client
app.get('/api/search-client/:phone', isAuthenticated, async (req, res) => {
    try {
        const phone = req.params.phone;
        const vin = req.query.vin;
        
        let query = `
            SELECT c.*, v.* FROM clients c
            LEFT JOIN vehicles v ON c.customer_id = v.customer_id
            WHERE c.phone_no = ?
        `;
        let params = [phone];
        
        if (vin) {
            query += " AND v.vin_no = ?";
            params.push(vin);
        }
        
        const [results] = await db.query(query, params);

        if (results.length > 0) {
            res.json(results[0]);
        } else {
            res.status(404).json({ message: "No client found" });
        }
    } catch (error) {
        console.error('Search client error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all clients
app.get('/api/all-clients', isAuthenticated, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.customer_id, c.full_name, c.phone_no, c.oil_card_no, 
                   v.vin_no, v.make, v.model, v.year, v.color, v.reg_no 
            FROM clients c
            LEFT JOIN vehicles v ON c.customer_id = v.customer_id
            ORDER BY c.full_name ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error('All clients error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update Record
app.put('/api/update-record', isAuthenticated, async (req, res) => {
    const { 
        customer_id, full_name, phone_no, oil_card_no, 
        vin_no, make, model, year, color, reg_no 
    } = req.body;

    try {
        if (!customer_id) return res.status(400).json({ error: "Customer ID is required" });

        await db.query(
            "UPDATE clients SET full_name = ?, phone_no = ?, oil_card_no = ? WHERE customer_id = ?",
            [full_name, phone_no, oil_card_no, customer_id]
        );

        if (vin_no) {
            await db.query(
                "UPDATE vehicles SET make = ?, model = ?, year = ?, color = ?, reg_no = ? WHERE vin_no = ?",
                [make, model, year, color, reg_no, vin_no]
            );
        }

        res.json({ message: "Record updated successfully" });
    } catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Delete Record
app.delete('/api/delete-customer/:customer_id', isAuthenticated, async (req, res) => {
    try {
        await db.query("DELETE FROM clients WHERE customer_id = ?", [req.params.customer_id]);
        res.json({ message: "Customer deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/delete-vehicle/:vin_no', isAuthenticated, async (req, res) => {
    try {
        await db.query("DELETE FROM vehicles WHERE vin_no = ?", [req.params.vin_no]);
        res.json({ message: "Vehicle deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Not Found',
        path: req.path,
        method: req.method
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});

// Export for Vercel serverless functions
module.exports = app;