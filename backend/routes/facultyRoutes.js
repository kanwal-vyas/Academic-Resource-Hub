import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        f.education,
        f.research_interests,
        f.open_for_interns,
        f.open_for_research,
        f.open_for_mentoring,
        f.updated_at
      FROM users u
      JOIN faculty_profiles f ON u.id = f.user_id
      WHERE u.role = 'faculty'
      ORDER BY f.updated_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recent', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        f.education,
        f.research_interests,
        f.open_for_interns,
        f.open_for_research,
        f.open_for_mentoring,
        f.updated_at
      FROM users u
      JOIN faculty_profiles f ON u.id = f.user_id
      WHERE u.role = 'faculty'
      ORDER BY f.updated_at DESC
      LIMIT 2
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent faculty:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        f.education,
        f.research_interests,
        f.phd_topic,
        f.open_for_interns,
        f.open_for_research,
        f.open_for_mentoring
      FROM users u
      JOIN faculty_profiles f ON u.id = f.user_id
      WHERE u.id = $1 AND u.role = 'faculty'
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Faculty not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching faculty by id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;