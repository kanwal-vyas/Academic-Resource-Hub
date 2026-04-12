import pool from './db.js';

const sql = `
  CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

pool.query(sql)
  .then(() => { console.log('contact_messages table created successfully'); pool.end(); })
  .catch(err => { console.error('Migration failed:', err.message); pool.end(); });
