import pg from 'pg';
import config from './config.js';
const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if columns exist, if not add them
    await client.query(`
      ALTER TABLE faculty_profiles 
      ADD COLUMN IF NOT EXISTS department TEXT,
      ADD COLUMN IF NOT EXISTS internship_details TEXT,
      ADD COLUMN IF NOT EXISTS research_details TEXT,
      ADD COLUMN IF NOT EXISTS mentoring_details TEXT,
      ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

    `);

    // Add is_suspended column to users if it doesn't exist
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
    `);

    // Add ai_summary column to resources if it doesn't exist
    await client.query(`
      ALTER TABLE resources
      ADD COLUMN IF NOT EXISTS ai_summary TEXT,
      ADD COLUMN IF NOT EXISTS summary_last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);

    // Initialize existing summary_last_accessed_at with created_at where it is null
    await client.query(`
      UPDATE resources SET summary_last_accessed_at = created_at WHERE summary_last_accessed_at IS NULL;
    `);

    // Create chat_history table 
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'model')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
    `);

    // Performance Indexes for Resources
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_resources_contributor ON resources(contributor_id);
      CREATE INDEX IF NOT EXISTS idx_resources_subject ON resources(subject_id);
      CREATE INDEX IF NOT EXISTS idx_resources_visibility ON resources(visibility);
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
