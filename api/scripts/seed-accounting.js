const fs = require('fs');
const path = require('path');
const db = require('../db');

function parseDate(dateStr) {
    if (!dateStr) return null;
    const months = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };
    const parts = dateStr.trim().split(' ');
    if (parts.length === 3) {
        const day = parts[0].padStart(2, '0');
        const month = months[parts[1]];
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return null;
}

async function seed() {
    try {
        console.log("Creating tables...");
        await db.query(`
            CREATE TABLE IF NOT EXISTS sales (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE,
                description VARCHAR(255),
                aed DECIMAL(10,2),
                quantity INT,
                total DECIMAL(10,2)
            )
        `);
        await db.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                date DATE,
                category VARCHAR(100),
                description VARCHAR(255),
                aed DECIMAL(10,2),
                quantity INT,
                total DECIMAL(10,2)
            )
        `);

        console.log("Seeding sales...");
        const salesData = fs.readFileSync(path.join(__dirname, '../../SALES & EXPENSES - SALES.csv'), 'utf8');
        const salesLines = salesData.trim().split('\n').slice(1);
        
        for (const line of salesLines) {
            // Regex to handle quotes if any, but a simple split works for these specific files which don't have commas in fields
            const parts = line.split(',');
            // Actually, we must handle commas in quotes.
            // Let's use a simple regex for CSV parsing
            const row = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
            // If the simple match fails, let's just do a naive split and manually fix "Scrap - Used Spark Plugs" which has no commas inside
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length < 5) continue;

            const date = parseDate(cols[0].trim());
            const description = cols[1].replace(/^"|"$/g, '').trim();
            const aed = parseFloat(cols[2]) || 0;
            const quantity = parseInt(cols[3]) || null;
            const total = parseFloat(cols[4]) || 0;

            if (date) {
                await db.query(
                    "INSERT INTO sales (date, description, aed, quantity, total) VALUES (?, ?, ?, ?, ?)",
                    [date, description, aed, quantity, total]
                );
            }
        }
        console.log("Sales seeded.");

        console.log("Seeding expenses...");
        const expensesData = fs.readFileSync(path.join(__dirname, '../../SALES & EXPENSES - EXPENSES.csv'), 'utf8');
        let expensesLines = expensesData.trim().split('\n').slice(1);
        
        // Remove the last item as requested
        expensesLines.pop();

        for (const line of expensesLines) {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (cols.length < 6) continue;

            const dateStr = cols[0].trim();
            const category = cols[1] ? cols[1].replace(/^"|"$/g, '').trim() : '';
            const description = cols[2] ? cols[2].replace(/^"|"$/g, '').trim() : '';
            const aed = parseFloat(cols[3]) || 0;
            const quantity = parseInt(cols[4]) || null;
            const total = parseFloat(cols[5]) || 0;

            // Skip summary rows (where category is empty or date is just a month)
            if (!category) continue;

            const date = parseDate(dateStr);
            if (date) {
                await db.query(
                    "INSERT INTO expenses (date, category, description, aed, quantity, total) VALUES (?, ?, ?, ?, ?, ?)",
                    [date, category, description, aed, quantity, total]
                );
            }
        }
        console.log("Expenses seeded.");
        process.exit(0);

    } catch (err) {
        console.error("Error seeding:", err);
        process.exit(1);
    }
}

seed();
