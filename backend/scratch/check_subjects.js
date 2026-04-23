import pool from '../db.js';
async function check() {
  try {
    const res = await pool.query('SELECT name FROM subjects');
    console.log('Subjects in DB:', res.rows.map(r => r.name));
    const res2 = await pool.query('SELECT DISTINCT subject_name FROM resources WHERE is_verified = true');
    console.log('Subjects with verified resources:', res2.rows.map(r => r.subject_name));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
check();
