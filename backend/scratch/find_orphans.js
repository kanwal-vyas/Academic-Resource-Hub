import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function findOrphanedUsers() {
    // 1. Get all auth users
    const { data: { users: authUsers }, error } = await supabase.auth.admin.listUsers();
    if (error) { console.error(error); return; }

    // 2. Get all public users
    const { rows: publicUsers } = await pool.query('SELECT id FROM users');
    const publicIds = new Set(publicUsers.map(u => u.id));

    // 3. Find orphans (in auth but not in public)
    const orphans = authUsers.filter(u => !publicIds.has(u.id));

    console.log(`Found ${orphans.length} orphaned users (Auth only):`);
    console.log(JSON.stringify(orphans.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        metadata: u.user_metadata
    })), null, 2));
    
    pool.end();
}

findOrphanedUsers();
