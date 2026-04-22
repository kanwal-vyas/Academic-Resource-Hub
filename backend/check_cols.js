import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'notifications'");
  console.log(r.rows.map(c => c.column_name));
  await pool.end();
}
check();
