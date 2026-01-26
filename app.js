const express = require('express');
const db = require('./db');
const app = express();

// allows app to read JSON data sent from a form
app.use(express.json());
// to show your index.html
app.use(express.static('public')); 

// --- THE "REGISTER" ROUTE ---
app.post('/create-job-card', async (req, res) => {
    const { 
        full_name, phone_no, oil_card_no, 
        vin_no, make, model, year, color, reg_no, 
        date_in, mileage 
    } = req.body;

    try {
        // Simple check: if date_in is empty, use today's date
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

        // 3. Finally, create the Job Card
        const [jobResult] = await db.query(
            "INSERT INTO job_cards (date_in, mileage, vin_no, customer_id) VALUES (?, ?, ?, ?)",
            [finalDate, mileage, vin_no, customerId]
        );

        res.status(201).json({ 
            message: "Success!", 
            job_no: jobResult.insertId,
            status: existingClients.length > 0 ? "Existing Client" : "New Client Created"
        });

    } catch (error) {
    console.error("DEBUG ERROR:", error); // prints the EXACT problem
    res.status(500).json({ error: error.message }); // sends the exact problem to Thunder Client
}
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 HRC Automator running on http://localhost:${PORT}`);
});