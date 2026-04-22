// backend/routes/courseRoutes.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

/**
 * GET /api/courses
 * Public endpoint to fetch all available courses.
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, code, name, degree_type, department
      FROM courses
      ORDER BY name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
