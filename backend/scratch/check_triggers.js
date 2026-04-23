import pool from '../db.js';

async function check() {
  try {
    const res = await pool.query("SELECT trigger_name, event_manipulation, event_object_table, action_statement FROM information_schema.triggers WHERE event_object_table = 'users'");
    console.log('Triggers on public.users:', res.rows);
    
    // Check if we can see auth schema triggers (might fail due to permissions)
    try {
        const authRes = await pool.query("SELECT conname FROM pg_constraint WHERE conrelid = 'auth.users'::regclass");
        console.log('Auth users constraints:', authRes.rows);
    } catch (e) {
        console.log('Cannot access auth schema directly.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
