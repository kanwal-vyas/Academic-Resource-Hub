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

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'faculty') {
      return res.status(403).json({ error: 'Only faculty can update profiles' });
    }

    const {
      education,
      research_interests,
      phd_topic,
      open_for_interns,
      open_for_research,
      open_for_mentoring,
      internship_details,
      research_details,
      mentoring_details
    } = req.body;

    let result = await pool.query(`
      UPDATE faculty_profiles
      SET 
        education = COALESCE($1, education),
        research_interests = COALESCE($2, research_interests),
        phd_topic = COALESCE($3, phd_topic),
        open_for_interns = COALESCE($4, open_for_interns),
        open_for_research = COALESCE($5, open_for_research),
        open_for_mentoring = COALESCE($6, open_for_mentoring),
        internship_details = COALESCE($7, internship_details),
        research_details = COALESCE($8, research_details),
        mentoring_details = COALESCE($9, mentoring_details),
        updated_at = NOW()
      WHERE user_id = $10
      RETURNING *
    `, [
      education, research_interests, phd_topic,
      open_for_interns, open_for_research, open_for_mentoring,
      internship_details, research_details, mentoring_details,
      userId
    ]);

    if (result.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO faculty_profiles 
          (user_id, education, research_interests, phd_topic, open_for_interns, open_for_research, open_for_mentoring, internship_details, research_details, mentoring_details, status, updated_at)
        VALUES 
          ($10, $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', NOW())
        RETURNING *
      `, [
        education, research_interests, phd_topic,
        open_for_interns || false, open_for_research || false, open_for_mentoring || false,
        internship_details, research_details, mentoring_details,
        userId
      ]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating faculty profile:', error);
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
        f.open_for_mentoring,
        f.internship_details,
        f.research_details,
        f.mentoring_details
      FROM users u
      LEFT JOIN faculty_profiles f ON u.id = f.user_id
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