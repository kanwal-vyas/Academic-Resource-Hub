import pool from '../db.js';

async function check() {
  try {
    const res = await pool.query("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'resources' AND column_name = 'contributor_id'");
    console.log('contributor_id is_nullable:', res.rows[0].is_nullable);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
