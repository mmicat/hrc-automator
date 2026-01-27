const express = require('express');
const db = require('./db');
const app = express();

// allows app to read JSON data sent from a form
app.use(express.json());
// to show your index.html
app.use(express.static('public')); 

// --- THE "REGISTER" ROUTE ---
app.post('/create-job-card', async (req, res) => {
    // 1. Add job_no here so the server "sees" it from the form
    const { 
        job_no, full_name, phone_no, oil_card_no, 
        vin_no, make, model, year, color, reg_no, 
        date_in, mileage 
    } = req.body;

    try {
        const finalDate = date_in || new Date().toISOString().split('T')[0];

        // 1. Check if client exists by Phone Number
        const [existingClients] = await db.query("SELECT customer_id FROM clients WHERE phone_no = ?", [phone_no]);
        
        let customerId;

        if (existingClients.length > 0) {
            // Client exists! Use their ID
            customerId = existingClients[0].customer_id;
            console.log(`Found existing client: ${full_name} (ID: ${customerId})`);
        } else {
            // Client is new! Register them
            const [newClient] = await db.query(
                "INSERT INTO clients (full_name, phone_no, oil_card_no) VALUES (?, ?, ?)",
                [full_name, phone_no, oil_card_no]
            );
            customerId = newClient.insertId;
            console.log(`Registered NEW client: ${full_name} (ID: ${customerId})`);
        }

        // 2. Check if the Vehicle exists (by VIN)
        const [existingVehicles] = await db.query("SELECT vin_no FROM vehicles WHERE vin_no = ?", [vin_no]);
        
        if (existingVehicles.length === 0) {
            // Vehicle is new to the system, save it
            await db.query(
                "INSERT INTO vehicles (vin_no, make, model, year, color, reg_no, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [vin_no, make, model, year, color, reg_no, customerId]
            );
        }

        // 3. Update the INSERT query to use the job_no we just extracted
        const [jobResult] = await db.query(
            "INSERT INTO job_cards (job_no, date_in, mileage, vin_no, customer_id) VALUES (?, ?, ?, ?, ?)",
            [job_no, finalDate, mileage, vin_no, customerId]
        );

        res.status(201).json({ 
            message: "Success!", 
            job_no: job_no, // Send back the same number we used
            status: "Job Card Created"
        });

    } catch (error) {
        console.error("DEBUG ERROR:", error);
        res.status(500).json({ error: error.message });
    }
});

// Search for an existing client and their vehicle by phone number
app.get('/search-client/:phone', async (req, res) => {
    try {
        const phone = req.params.phone;
        
        // Join the clients and vehicles tables to get everything at once
        const [results] = await db.query(`
            SELECT c.*, v.* FROM clients c
            LEFT JOIN vehicles v ON c.customer_id = v.customer_id
            WHERE c.phone_no = ?
        `, [phone]);

        if (results.length > 0) {
            res.json(results[0]); // Send the first match found
        } else {
            res.status(404).json({ message: "No client found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Route to get the next available Job Card Number
app.get('/next-job-no', async (req, res) => {
    try {
        // Find the maximum job number currently in the table
        const [rows] = await db.query("SELECT MAX(job_no) as maxId FROM job_cards");
        
        // If the table is empty, start at 1089 (or your preferred start)
        // Otherwise, just add 1 to the highest number found
        const nextId = rows[0].maxId ? rows[0].maxId + 1 : 1089;
        
        res.json({ nextId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/all-clients', async (req, res) => {
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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 HRC Automator running on http://localhost:${PORT}`);
});