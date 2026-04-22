import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findRecentUsers() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
        console.error('Error:', error);
        return;
    }
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recent = users.filter(u => new Date(u.created_at) > twentyFourHoursAgo);
        
    console.log(`Found ${recent.length} users in the last 24 hours.`);
    console.log(JSON.stringify(recent.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        metadata: u.user_metadata
    })), null, 2));
}

findRecentUsers();
