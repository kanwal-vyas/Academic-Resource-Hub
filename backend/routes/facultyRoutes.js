import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// GET /api/faculty — all faculty
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
      INNER JOIN faculty_profiles f ON u.id = f.user_id
      WHERE u.role = 'faculty' 
        AND u.is_suspended = false
        AND f.is_visible = true
        AND (NULLIF(f.education, '') IS NOT NULL OR NULLIF(f.research_interests, '') IS NOT NULL)
      ORDER BY u.full_name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/faculty/recent — latest 2 faculty for homepage
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
        AND u.is_suspended = false
        AND f.is_visible = true
        AND (NULLIF(f.education, '') IS NOT NULL OR NULLIF(f.research_interests, '') IS NOT NULL)
      ORDER BY f.updated_at DESC
      LIMIT 3
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching recent faculty:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/faculty/profile — faculty updates their own profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'faculty') {
      return res.status(403).json({ success: false, error: 'Only faculty can update profiles' });
    }

    let { 
      education, 
      research_interests, 
      phd_topic,
      open_for_interns,
      open_for_research,
      open_for_mentoring,
      internship_details,
      research_details,
      mentoring_details,
      department,
      is_visible
    } = req.body;

    // Normalize empty fields to 'N/A'
    education = (education && education.trim()) ? education.trim() : "N/A";
    research_interests = (research_interests && research_interests.trim()) ? research_interests.trim() : "N/A";
    phd_topic = (phd_topic && phd_topic.trim()) ? phd_topic.trim() : "N/A";

    let result = await pool.query(`
      UPDATE faculty_profiles
      SET 
        education = $1, 
        research_interests = $2, 
        phd_topic = $3,
        open_for_interns = $4,
        open_for_research = $5,
        open_for_mentoring = $6,
        internship_details = $7,
        research_details = $8,
        mentoring_details = $9,
        department = $10,
        is_visible = $11,
        updated_at = NOW()
      WHERE user_id = $12
      RETURNING *
    `, [
      education, 
      research_interests, 
      phd_topic, 
      open_for_interns, 
      open_for_research, 
      open_for_mentoring,
      internship_details,
      research_details,
      mentoring_details,
      department,
      is_visible !== undefined ? is_visible : true,
      userId
    ]);

    if (result.rows.length === 0) {
      result = await pool.query(`
        INSERT INTO faculty_profiles 
          (user_id, education, research_interests, phd_topic, open_for_interns, open_for_research, open_for_mentoring, internship_details, research_details, mentoring_details, status, is_visible, updated_at)
        VALUES 
          ($11, $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, NOW())
        RETURNING *
      `, [
        education, 
        research_interests, 
        phd_topic,
        open_for_interns || false, 
        open_for_research || false, 
        open_for_mentoring || false,
        internship_details, 
        research_details, 
        mentoring_details,
        is_visible !== undefined ? is_visible : true,
        userId
      ]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating faculty profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/faculty/:id — single faculty profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id,
        u.full_name,
        u.email,
        f.education,
        f.research_interests,
        f.phd_topic,
        f.open_for_interns,
        f.open_for_research,
        f.open_for_mentoring,
        f.internship_details,
        f.research_details,
        f.mentoring_details,
        f.status,
        f.is_visible
      FROM users u
      LEFT JOIN faculty_profiles f ON u.id = f.user_id
      WHERE u.id = $1 AND u.role = 'faculty' AND u.is_suspended = false
    `, [id]);

    if (result.rows.length === 0) {
      const userCheck = await pool.query("SELECT id, role FROM users WHERE id = $1", [id]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Faculty not found' });
      }
      return res.status(403).json({ success: false, error: 'User is not a faculty member' });
    }

    const facultyData = result.rows[0];
    const isOwner = req.user.id === facultyData.id;
    const isAdmin = req.user.role === 'admin';
    const isInitialized = (facultyData.education && facultyData.education.trim() !== '') || 
                          (facultyData.research_interests && facultyData.research_interests.trim() !== '');

    if (!isInitialized && !isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Faculty profile is not yet initialized' });
    }

    res.json({ success: true, data: facultyData });
  } catch (error) {
    console.error('Error fetching faculty by id:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;