import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if columns exist, if not add them
    await client.query(`
      ALTER TABLE faculty_profiles 
      ADD COLUMN IF NOT EXISTS internship_details TEXT,
      ADD COLUMN IF NOT EXISTS research_details TEXT,
      ADD COLUMN IF NOT EXISTS mentoring_details TEXT;
    `);

    // Add is_suspended column to users if it doesn't exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
    `);

    // Add ai_summary column to resources if it doesn't exist
    await client.query(`
      ALTER TABLE resources
      ADD COLUMN IF NOT EXISTS ai_summary TEXT;
    `);

    await client.query("COMMIT");
    console.log("Database schema updated successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating schema:", err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
