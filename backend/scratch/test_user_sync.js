import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createTestUser() {
    const email = `test_admin_check_${Date.now()}@example.com`;
    const password = 'Password123!';
    
    console.log('Creating test user:', email);
    
    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Admin Test User' }
    });
    
    if (error) {
        console.error('Auth Create Error:', error);
        return;
    }
    
    console.log('User created in Auth:', data.user.id);
    
    // Check if they are in public.users (trigger check)
    // Wait a bit for trigger
    setTimeout(async () => {
        const { createClient: createPg } = await import('pg');
        const pool = new (await import('pg')).default.Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        const res = await pool.query('SELECT * FROM users WHERE id = $1', [data.user.id]);
        if (res.rows.length > 0) {
            console.log('SUCCESS: User synced to public.users!');
        } else {
            console.log('FAILURE: User NOT synced to public.users. Trigger might be missing or broken.');
        }
        pool.end();
    }, 2000);
}

createTestUser();
