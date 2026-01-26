const db = require('./db');

async function checkConnection() {
  try {
    // This query asks the database for a list of all tables you just created
    const [tables] = await db.query("SHOW TABLES");
    
    console.log("--- 🟢 Connection Successful! ---");
    console.log("I found these tables in hrc_automator:");
    
    tables.forEach(row => {
      console.log(`- ${Object.values(row)[0]}`);
    });

  } catch (error) {
    console.error("--- 🔴 Connection Failed! ---");
    console.error("Error details:", error.message);
  } finally {
    process.exit();
  }
}

checkConnection();