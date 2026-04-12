import express from 'express';
import { createClient } from '@supabase/supabase-js';
import pool from '../db.js';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/auth/check-email
// Public endpoint to check if an email is registered
router.post('/check-email', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const result = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error('Check email error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/contact
// Public endpoint — anyone can submit a contact message (no auth required)
router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  try {
    await pool.query(
      `INSERT INTO contact_messages (id, name, email, subject, message)
       VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
      [name.trim(), email.trim().toLowerCase(), subject?.trim() || null, message.trim()]
    );
    res.status(201).json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error('Contact form error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

// POST /api/auth/faculty/register
// Faculty self-registration — creates Supabase user + DB records, sets status = 'pending'
router.post('/faculty/register', async (req, res) => {
  const { email, password, full_name, department, employee_id, education, research_interests } = req.body;

  if (!email || !password || !full_name || !department || !employee_id) {
    return res.status(400).json({ error: 'Missing required fields: email, password, full_name, department, employee_id' });
  }

  if (!email.endsWith('@rru.ac.in')) {
    return res.status(400).json({ error: 'Only @rru.ac.in email addresses can register as faculty' });
  }

  try {
    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // 2. Insert into users table with role = 'faculty'
    await pool.query(
      `INSERT INTO users (id, email, full_name, role, is_verified)
       VALUES ($1, $2, $3, 'faculty', false)
       ON CONFLICT (id) DO UPDATE SET full_name = $3, role = 'faculty'`,
      [userId, email, full_name]
    );

    // 3. Insert into faculty_profiles with status = 'approved'
    await pool.query(
      `INSERT INTO faculty_profiles (user_id, department, employee_id, education, research_interests, status)
       VALUES ($1, $2, $3, $4, $5, 'approved')
       ON CONFLICT (user_id) DO UPDATE
         SET department = $2, employee_id = $3, education = $4, research_interests = $5, status = 'approved'`,
      [userId, department, employee_id, education || null, research_interests || null]
    );

    res.status(201).json({ message: 'Registration successful! You may now log in.', userId });
  } catch (err) {
    console.error('Faculty registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// GET /api/auth/faculty/status
// Faculty checks their own approval status (requires auth token)
router.get('/faculty/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const token = authHeader.split(' ')[1];
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const result = await pool.query(
      `SELECT fp.status, fp.rejection_reason, u.full_name, u.email
       FROM faculty_profiles fp
       JOIN users u ON u.id = fp.user_id
       WHERE fp.user_id = $1`,
      [data.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Status check error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
