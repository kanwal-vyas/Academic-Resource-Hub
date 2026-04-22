import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import config from '../config.js';
import { getIO } from '../socket.js';
import { notifyCourseSubscribers } from '../utils/notifications.js';

const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey
);

const router = express.Router();

// Middleware: admin-only guard
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
}

// GET /api/admin/stats — dashboard summary stats
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [
      facultyRes, studentsRes, coursesRes, subjectsRes,
      totalResourcesRes, pendingResourcesRes
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'faculty'`),
      pool.query(`SELECT COUNT(*) FROM users WHERE role = 'student'`),
      pool.query(`SELECT COUNT(*) FROM courses`),
      pool.query(`SELECT COUNT(*) FROM subjects`),
      pool.query(`SELECT COUNT(*) FROM resources`),
      pool.query(`SELECT COUNT(*) FROM resources WHERE is_verified = false`),
    ]);

    // Fetch Auth users to count pending ones
    const { data: { users: authUsers } } = await supabase.auth.admin.listUsers();
    const dbUserCount = parseInt((await pool.query('SELECT COUNT(*) FROM users')).rows[0].count);
    const authUserCount = authUsers.length;
    
    // The "True" total is the Auth count (since everyone starts there)
    // We'll adjust students count if some are pending
    const dbStudentCount = parseInt(studentsRes.rows[0].count);
    const pendingCount = Math.max(0, authUserCount - dbUserCount);

    res.json({
      success: true,
      data: {
        faculty: parseInt(facultyRes.rows[0].count),
        students: dbStudentCount + pendingCount, // Include pending as students
        courses: parseInt(coursesRes.rows[0].count),
        subjects: parseInt(subjectsRes.rows[0].count),
        total_resources: parseInt(totalResourcesRes.rows[0].count),
        pending_resources: parseInt(pendingResourcesRes.rows[0].count),
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
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
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Course code already exists' });
    console.error('Error creating course:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/courses/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM courses WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Course not found' });
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
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Subject code already exists' });
    console.error('Error creating subject:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/subjects/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM subjects WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Subject not found' });
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
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'Academic year already exists' });
    console.error('Error creating academic year:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/academic-years/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM academic_years WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
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
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'This subject offering already exists for that year' });
    console.error('Error creating offering:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/subject-offerings/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM subject_offerings WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
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
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'This unit number already exists for this offering' });
    console.error('Error creating unit:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/units/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM units WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Not found' });
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
        r.external_url, r.storage_path, r.created_at, r.is_verified, r.ai_summary,
        s.code AS subject_code, s.name AS subject_name,
        c.name AS course_name,
        u.full_name AS contributor_name, u.email AS contributor_email, u.role AS contributor_role,
        ay.start_year, ay.end_year, un.unit_number,
        fac.full_name AS faculty_name
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON r.contributor_id = u.id
      LEFT JOIN subject_offerings so ON r.subject_offering_id = so.id
      LEFT JOIN academic_years ay ON so.academic_year_id = ay.id
      LEFT JOIN units un ON r.unit_id = un.id
      LEFT JOIN users fac ON so.faculty_id = fac.id
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
        r.external_url, r.storage_path, r.created_at, r.is_verified, r.verified_at, r.ai_summary,
        s.code AS subject_code, s.name AS subject_name,
        c.name AS course_name,
        u.full_name AS contributor_name, u.email AS contributor_email, u.role AS contributor_role,
        verifier.full_name AS verified_by_name,
        ay.start_year, ay.end_year, un.unit_number,
        fac.full_name AS faculty_name
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      JOIN courses c ON s.course_id = c.id
      JOIN users u ON r.contributor_id = u.id
      LEFT JOIN users verifier ON r.verified_by = verifier.id
      LEFT JOIN subject_offerings so ON r.subject_offering_id = so.id
      LEFT JOIN academic_years ay ON so.academic_year_id = ay.id
      LEFT JOIN units un ON r.unit_id = un.id
      LEFT JOIN users fac ON so.faculty_id = fac.id
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
    // 1. Update resource as verified
    const result = await pool.query(
      `UPDATE resources
       SET is_verified = true, verified_by = $1, verified_at = NOW()
       WHERE id = $2
       RETURNING id, title, is_verified, verified_at, contributor_id, subject_id`,
      [req.user.id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Resource not found' });

    const resource = result.rows[0];

    // 2. Fetch context for notification (subject info and course ID)
    const contextResult = await pool.query(
      `SELECT s.name AS subject_name, s.course_id
       FROM subjects s
       WHERE s.id = $1`,
      [resource.subject_id]
    );
    const ctx = contextResult.rows[0] || {};

    // 3. Trigger targeted course notification
    try {
      notifyCourseSubscribers({
        courseId: ctx.course_id,
        resourceId: resource.id,
        title: 'New Resource Verified',
        message: `The resource "${resource.title}" for ${ctx.subject_name} has been verified and is now available.`,
      }).catch(err => console.error('Notification failed:', err));

      console.log(`[Notifications] Admin-triggered for resource ${resource.id}`);
    } catch (notifyErr) {
      console.error('[Notifications] Trigger failed (non-fatal):', notifyErr.message);
    }


    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error verifying resource:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/resources/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    // 1. Fetch resource to check for storage file
    const fetchResult = await client.query('SELECT storage_path, content_type FROM resources WHERE id = $1', [id]);
    if (fetchResult.rows.length === 0) return res.status(404).json({ success: false, error: 'Resource not found' });
    
    const resource = fetchResult.rows[0];
    await client.query('BEGIN');

    // 2. Delete from Supabase Storage if applicable
    if (resource.content_type === 'file' && resource.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('resources')
        .remove([resource.storage_path]);
      if (storageError) {
        console.error('Admin delete: Storage cleanup failed (non-fatal):', storageError.message);
      }
    }

    // 3. Delete from Database
    const result = await client.query(`DELETE FROM resources WHERE id = $1 RETURNING id`, [id]);
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting resource:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// ============================================================================
// USERS LIST
// ============================================================================

// GET /api/admin/users — all users list
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    // 1. Fetch all users from public.users table (with faculty profile info)
    const dbResult = await pool.query(`
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

    // 2. Fetch all users from Supabase Auth to find "pending" or "orphaned" accounts
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Supabase Auth fetch error:', authError);
      return res.json({ success: true, data: dbResult.rows });
    }

    const dbUsers = dbResult.rows;
    const dbUserIds = new Set(dbUsers.map(u => u.id));

    // 3. Identify users who are in Auth but NOT in public.users yet
    const pendingUsers = authUsers
      .filter(au => !dbUserIds.has(au.id))
      .map(au => ({
        id: au.id,
        full_name: au.user_metadata?.full_name || 'New User (Pending Sync)',
        email: au.email,
        role: 'student', // Default assumption
        is_suspended: false,
        is_verified: !!au.email_confirmed_at,
        created_at: au.created_at,
        department: null,
        is_pending_sync: true
      }));

    // 4. Combine and sort
    const allUsers = [...dbUsers, ...pendingUsers].sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );

    console.log('--- ADMIN USER FETCH DIAGNOSTIC ---');
    console.log('Total users found:', allUsers.length);
    console.log('Emails:', allUsers.map(u => u.email).join(', '));
    console.log('-----------------------------------');

    res.json({ success: true, data: allUsers });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/users/:id/verify', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Get user info from Auth to ensure they exist and have metadata
    const { data: { user: authUser }, error: getUserError } = await supabase.auth.admin.getUserById(id);
    if (getUserError || !authUser) {
      return res.status(404).json({ success: false, error: 'User not found in Supabase Auth' });
    }

    // 2. Mark as verified in Supabase Auth (bypassing email confirm)
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      email_confirm: true
    });
    if (authError) {
      console.error('Supabase Auth verification failed:', authError);
      return res.status(500).json({ success: false, error: 'Failed to verify email in Supabase' });
    }

    // 3. Ensure user exists in local DB and mark as verified
    // Use ON CONFLICT to sync them if they were missing (is_pending_sync case)
    await pool.query(`
      INSERT INTO users (id, full_name, email, role, is_verified)
      VALUES ($1, $2, $3, 'student', true)
      ON CONFLICT (id) DO UPDATE SET is_verified = true
    `, [id, authUser.user_metadata?.full_name || 'User', authUser.email]);

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
      return res.status(500).json({ success: false, error: 'Failed to unverify email in Supabase' });
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
    // 1. Get user info from Auth for sync
    const { data: { user: authUser }, error: getUserError } = await supabase.auth.admin.getUserById(id);
    if (getUserError || !authUser) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 2. Ban in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: '87600h' // 10 years
    });
    if (authError) {
      console.error('Supabase Auth ban failed:', authError);
      return res.status(500).json({ success: false, error: 'Failed to suspend user in Supabase' });
    }

    // 3. Ensure user exists in local DB and suspend
    await pool.query(`
      INSERT INTO users (id, full_name, email, role, is_suspended)
      VALUES ($1, $2, $3, 'student', true)
      ON CONFLICT (id) DO UPDATE SET is_suspended = true
    `, [id, authUser.user_metadata?.full_name || 'User', authUser.email]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error suspending user:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

router.post('/users/:id/unsuspend', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Lift ban in Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: 'none'
    });
    if (authError) {
      console.error('Supabase Auth unban failed:', authError);
      return res.status(500).json({ success: false, error: 'Failed to unsuspend user in Supabase' });
    }

    // 2. Update local DB
    await pool.query('UPDATE users SET is_suspended = false WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error unsuspending user:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
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

// PUT /api/admin/faculty/:id — update a faculty profile (full edit)
router.put('/faculty/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params; // this is the user_id
  const {
    department, employee_id, education, research_interests, phd_topic,
    open_for_interns, open_for_research, open_for_mentoring,
    internship_details, research_details, mentoring_details
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE faculty_profiles 
       SET department = $1, employee_id = $2, education = $3, 
           research_interests = $4, phd_topic = $5,
           open_for_interns = $6, open_for_research = $7, open_for_mentoring = $8,
           internship_details = $9, research_details = $10, mentoring_details = $11,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $12
       RETURNING *`,
      [
        department, employee_id, education, research_interests, phd_topic,
        open_for_interns, open_for_research, open_for_mentoring,
        internship_details, research_details, mentoring_details,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Faculty profile not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating faculty profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// CONTACT MESSAGES
// ============================================================================

// GET /api/admin/messages — list all contact messages (newest first)
router.get('/messages', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, subject, message, is_read, created_at
      FROM contact_messages
      ORDER BY created_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/messages/:id/read — mark a message as read
router.patch('/messages/:id/read', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE contact_messages SET is_read = true WHERE id = $1 RETURNING id`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/messages/:id — delete a message
router.delete('/messages/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM contact_messages WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Message not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

