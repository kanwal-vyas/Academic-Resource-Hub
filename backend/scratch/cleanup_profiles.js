import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const res = await pool.query(`
            DELETE FROM faculty_profiles 
            WHERE (education IS NULL OR education = '') 
              AND (research_interests IS NULL OR research_interests = '')
            RETURNING *
        `);
        console.log('Deleted Profiles:', JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();
