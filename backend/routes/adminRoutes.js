import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const router = express.Router();

// Middleware: admin-only guard
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// GET /api/admin/faculty/pending — list all pending faculty registrations
router.get('/faculty/pending', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.created_at,
        fp.department, fp.employee_id, fp.education,
        fp.research_interests, fp.status, fp.rejection_reason
      FROM faculty_profiles fp
      JOIN users u ON u.id = fp.user_id
      WHERE fp.status = 'pending'
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pending faculty:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/faculty/all — list all faculty with statuses
router.get('/faculty/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.created_at, u.is_verified,
        fp.department, fp.employee_id, fp.education,
        fp.research_interests, fp.status, fp.rejection_reason,
        fp.open_for_interns, fp.open_for_research, fp.open_for_mentoring,
        fp.updated_at
      FROM faculty_profiles fp
      JOIN users u ON u.id = fp.user_id
      ORDER BY fp.status ASC, u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all faculty:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/faculty/:id/approve — approve a faculty registration
router.put('/faculty/:id/approve', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE faculty_profiles SET status = 'approved', rejection_reason = NULL WHERE user_id = $1`,
      [id]
    );
    await pool.query(
      `UPDATE users SET is_verified = true WHERE id = $1`,
      [id]
    );
    res.json({ message: 'Faculty approved successfully' });
  } catch (err) {
    console.error('Error approving faculty:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/admin/faculty/:id/reject — reject a faculty registration
router.put('/faculty/:id/reject', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    await pool.query(
      `UPDATE faculty_profiles SET status = 'rejected', rejection_reason = $1 WHERE user_id = $2`,
      [reason || 'Application rejected by administrator', id]
    );
    await pool.query(
      `UPDATE users SET is_verified = false WHERE id = $1`,
      [id]
    );
    res.json({ message: 'Faculty rejected' });
  } catch (err) {
    console.error('Error rejecting faculty:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats — dashboard summary stats
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [
      pendingRes, approvedRes, rejectedRes, studentsRes,
      coursesRes, subjectsRes, totalResourcesRes, pendingResourcesRes
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM faculty_profiles WHERE status = 'pending'`),
      pool.query(`SELECT COUNT(*) FROM faculty_profiles WHERE status = 'approved'`),
      pool.query(`SELECT COUNT(*) FROM faculty_profiles WHERE status = 'rejected'`),
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'student'`),
      pool.query(`SELECT COUNT(*) FROM courses`),
      pool.query(`SELECT COUNT(*) FROM subjects`),
      pool.query(`SELECT COUNT(*) FROM resources`),
      pool.query(`SELECT COUNT(*) FROM resources WHERE is_verified = false`),
    ]);

    res.json({
      pending: parseInt(pendingRes.rows[0].count),
      approved: parseInt(approvedRes.rows[0].count),
      rejected: parseInt(rejectedRes.rows[0].count),
      students: parseInt(studentsRes.rows[0].count),
      courses: parseInt(coursesRes.rows[0].count),
      subjects: parseInt(subjectsRes.rows[0].count),
      total_resources: parseInt(totalResourcesRes.rows[0].count),
      pending_resources: parseInt(pendingResourcesRes.rows[0].count),
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// CONTENT MANAGEMENT — COURSES
// ============================================================================

router.get('/courses', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.code, c.name, c.degree_type, c.department, c.created_at,
        COUNT(s.id)::int AS subject_count
      FROM courses c
      LEFT JOIN subjects s ON s.course_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/courses', authMiddleware, adminOnly, async (req, res) => {
  const { code, name, degree_type, department } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'code and name are required' });
  try {
    const result = await pool.query(
      `INSERT INTO courses (id, code, name, degree_type, department)
       VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *`,
      [code.toUpperCase(), name, degree_type || null, department || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Course code already exists' });
    console.error('Error creating course:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/courses/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM courses WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Course not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting course:', err);
    res.status(500).json({ error: 'Cannot delete — subjects may still exist under this course' });
  }
});

// ============================================================================
// CONTENT MANAGEMENT — SUBJECTS
// ============================================================================

router.get('/subjects', authMiddleware, adminOnly, async (req, res) => {
  const { course_id } = req.query;
  try {
    let query = `
      SELECT s.id, s.code, s.name, s.course_id, c.name AS course_name, s.created_at
      FROM subjects s JOIN courses c ON s.course_id = c.id
    `;
    const params = [];
    if (course_id) { query += ` WHERE s.course_id = $1`; params.push(course_id); }
    query += ` ORDER BY s.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/subjects', authMiddleware, adminOnly, async (req, res) => {
  const { code, name, course_id } = req.body;
  if (!code || !name || !course_id) return res.status(400).json({ error: 'code, name, and course_id are required' });
  try {
    const result = await pool.query(
      `INSERT INTO subjects (id, code, name, course_id)
       VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *`,
      [code.toUpperCase(), name, course_id]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Subject code already exists' });
    console.error('Error creating subject:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/subjects/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM subjects WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting subject:', err);
    res.status(500).json({ error: 'Cannot delete — resources or offerings may exist under this subject' });
  }
});

// ============================================================================
// CONTENT MANAGEMENT — ACADEMIC YEARS
// ============================================================================

router.get('/academic-years', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, start_year, end_year FROM academic_years ORDER BY start_year DESC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/academic-years', authMiddleware, adminOnly, async (req, res) => {
  const { start_year, end_year } = req.body;
  if (!start_year || !end_year) return res.status(400).json({ error: 'start_year and end_year are required' });
  try {
    const result = await pool.query(
      `INSERT INTO academic_years (id, start_year, end_year) VALUES (gen_random_uuid(), $1, $2) RETURNING *`,
      [parseInt(start_year), parseInt(end_year)]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Academic year already exists' });
    console.error('Error creating academic year:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/academic-years/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM academic_years WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete — offerings may reference this year' });
  }
});

// ============================================================================
// CONTENT MANAGEMENT — SUBJECT OFFERINGS (Subject + Year + Faculty assignment)
// ============================================================================

router.get('/subject-offerings', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT so.id, so.subject_id, so.academic_year_id, so.faculty_id,
        s.name AS subject_name, s.code AS subject_code,
        ay.start_year, ay.end_year,
        u.full_name AS faculty_name,
        COUNT(un.id)::int AS unit_count
      FROM subject_offerings so
      JOIN subjects s ON so.subject_id = s.id
      JOIN academic_years ay ON so.academic_year_id = ay.id
      LEFT JOIN users u ON so.faculty_id = u.id
      LEFT JOIN units un ON un.subject_offering_id = so.id
      GROUP BY so.id, s.name, s.code, ay.start_year, ay.end_year, u.full_name
      ORDER BY ay.start_year DESC, s.name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching subject offerings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/subject-offerings', authMiddleware, adminOnly, async (req, res) => {
  const { subject_id, academic_year_id, faculty_id } = req.body;
  if (!subject_id || !academic_year_id) return res.status(400).json({ error: 'subject_id and academic_year_id are required' });
  try {
    const result = await pool.query(
      `INSERT INTO subject_offerings (id, subject_id, academic_year_id, faculty_id)
       VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *`,
      [subject_id, academic_year_id, faculty_id || null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'This subject offering already exists for that year' });
    console.error('Error creating offering:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/subject-offerings/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM subject_offerings WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete — units or resources may exist under this offering' });
  }
});

// ============================================================================
// CONTENT MANAGEMENT — UNITS
// ============================================================================

router.get('/units', authMiddleware, adminOnly, async (req, res) => {
  const { offering_id } = req.query;
  try {
    let query = `
      SELECT u.id, u.unit_number, u.subject_offering_id,
        s.name AS subject_name, s.code AS subject_code,
        ay.start_year, ay.end_year
      FROM units u
      JOIN subject_offerings so ON u.subject_offering_id = so.id
      JOIN subjects s ON so.subject_id = s.id
      JOIN academic_years ay ON so.academic_year_id = ay.id
    `;
    const params = [];
    if (offering_id) { query += ` WHERE u.subject_offering_id = $1`; params.push(offering_id); }
    query += ` ORDER BY s.name ASC, u.unit_number ASC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching units:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/units', authMiddleware, adminOnly, async (req, res) => {
  const { subject_offering_id, unit_number } = req.body;
  if (!subject_offering_id || !unit_number) return res.status(400).json({ error: 'subject_offering_id and unit_number are required' });
  try {
    const result = await pool.query(
      `INSERT INTO units (id, subject_offering_id, unit_number)
       VALUES (gen_random_uuid(), $1, $2) RETURNING *`,
      [subject_offering_id, parseInt(unit_number)]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'This unit number already exists for this offering' });
    console.error('Error creating unit:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/units/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM units WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Cannot delete — resources may exist under this unit' });
  }
});

// ============================================================================
// RESOURCE VERIFICATION
// ============================================================================

router.get('/resources/pending', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.title, r.description, r.resource_type, r.content_type,
        r.external_url, r.created_at, r.is_verified,
        s.code AS subject_code, s.name AS subject_name,
        c.name AS course_name,
        u.full_name AS contributor_name, u.email AS contributor_email, u.role AS contributor_role
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON r.contributor_id = u.id
      WHERE r.is_verified = false
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching pending resources:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/resources/all', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.id, r.title, r.description, r.resource_type, r.content_type,
        r.external_url, r.created_at, r.is_verified, r.verified_at,
        s.code AS subject_code, s.name AS subject_name,
        c.name AS course_name,
        u.full_name AS contributor_name, u.email AS contributor_email, u.role AS contributor_role,
        verifier.full_name AS verified_by_name
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON r.contributor_id = u.id
      LEFT JOIN users verifier ON r.verified_by = verifier.id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching all resources:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/resources/:id/verify', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE resources
       SET is_verified = true, verified_by = $1, verified_at = NOW()
       WHERE id = $2 RETURNING id, title, is_verified`,
      [req.user.id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Resource not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error verifying resource:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/resources/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM resources WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Resource not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting resource:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// USERS LIST
// ============================================================================

router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.role, u.is_suspended, u.is_verified, u.created_at,
        CASE
          WHEN u.role = 'faculty' THEN fp.department
          ELSE NULL
        END AS department
      FROM users u
      LEFT JOIN faculty_profiles fp ON fp.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/verify', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Mark as verified in Supabase Auth (bypassing email confirm)
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      email_confirm: true
    });
    if (authError) {
      console.error('Supabase Auth verification failed:', authError);
      return res.status(500).json({ error: 'Failed to verify email in Supabase' });
    }

    // 2. Mark as verified in local Users table
    await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error verifying user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/unverify', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Mark as unverified in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      email_confirm: false
    });
    if (authError) {
      console.error('Supabase Auth unverification failed:', authError);
      return res.status(500).json({ error: 'Failed to unverify email in Supabase' });
    }

    // 2. Mark as unverified in local Users table
    await pool.query('UPDATE users SET is_verified = false WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error unverifying user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/suspend', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: '87600h' // Ban for 10 years in Supabase Auth
    });
    if (authError) {
      console.error('Supabase Auth ban failed:', authError);
      return res.status(500).json({ error: 'Failed to suspend user in Supabase' });
    }

    await pool.query('UPDATE users SET is_suspended = true WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error suspending user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/users/:id/unsuspend', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: 'none' // Lift the ban in Supabase Auth
    });
    if (authError) {
      console.error('Supabase Auth unban failed:', authError);
      return res.status(500).json({ error: 'Failed to unsuspend user in Supabase' });
    }

    await pool.query('UPDATE users SET is_suspended = false WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error unverifying user:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// ============================================================================
// FACULTY FULL LIST (separate from approval workflow)
// ============================================================================

router.get('/faculty/list', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id, u.full_name, u.email, u.is_verified, u.created_at,
        fp.department, fp.employee_id, fp.education,
        fp.research_interests, fp.phd_topic, fp.status,
        fp.open_for_interns, fp.open_for_research, fp.open_for_mentoring,
        fp.updated_at,
        COUNT(DISTINCT so.id)::int AS subjects_count,
        COUNT(DISTINCT r.id)::int  AS resources_count
      FROM users u
      JOIN faculty_profiles fp ON fp.user_id = u.id
      LEFT JOIN subject_offerings so ON so.faculty_id = u.id
      LEFT JOIN resources r ON r.contributor_id = u.id
      GROUP BY u.id, fp.department, fp.employee_id, fp.education,
               fp.research_interests, fp.phd_topic, fp.status,
               fp.open_for_interns, fp.open_for_research, fp.open_for_mentoring,
               fp.updated_at
      ORDER BY fp.status ASC, u.full_name ASC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching faculty list:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
