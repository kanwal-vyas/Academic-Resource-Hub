import dotenv from "dotenv";
dotenv.config();
import http from 'http';
import express from 'express';
import Busboy from 'busboy';
import { createClient } from '@supabase/supabase-js';
import pool from './db.js'
import cors from "cors";
import { authMiddleware } from './middleware/auth.js';
import meRouter from "./routes/me.js";
import facultyRoutes from './routes/facultyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { extractTextFromPDF, generateSummary, chatWithAI } from './utils/ai.js';

import { initSocketIO, getIO } from './socket.js';
import { notifyCourseSubscribers } from './utils/notifications.js';
const app = express();

const server = http.createServer(app);

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(express.json());

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function resolveSubject(subjectCode) {
  const result = await pool.query(
    'SELECT id, name FROM subjects WHERE code = $1',
    [subjectCode]
  );
  if (result.rows.length === 0) {
    throw new Error(`Subject with code '${subjectCode}' not found`);
  }
  return result.rows[0];
}

async function resolveAcademicYear(startYear, endYear) {
  const result = await pool.query(
    'SELECT id FROM academic_years WHERE start_year = $1 AND end_year = $2',
    [startYear, endYear]
  );
  if (result.rows.length === 0) {
    throw new Error(`Academic year ${startYear}-${endYear} not found`);
  }
  return result.rows[0].id;
}

async function resolveSubjectOffering(subjectId, academicYearId) {
  const result = await pool.query(
    'SELECT id, faculty_id FROM subject_offerings WHERE subject_id = $1 AND academic_year_id = $2',
    [subjectId, academicYearId]
  );
  if (result.rows.length === 0) {
    throw new Error('Subject offering not found for the given subject and academic year');
  }
  return result.rows[0];
}

async function resolveUnit(subjectOfferingId, unitNumber) {
  const result = await pool.query(
    'SELECT id FROM units WHERE subject_offering_id = $1 AND unit_number = $2',
    [subjectOfferingId, unitNumber]
  );
  if (result.rows.length === 0) {
    throw new Error(`Unit ${unitNumber} not found for this subject offering`);
  }
  return result.rows[0].id;
}

async function isAdmin(userId, client = pool) {
  const result = await client.query(
    'SELECT role FROM users WHERE id = $1',
    [userId]
  );
  return result.rows.length > 0 && result.rows[0].role === 'admin';
}

async function isResourceOwner(resourceId, userId, client = pool) {
  const result = await client.query(
    'SELECT contributor_id FROM resources WHERE id = $1',
    [resourceId]
  );
  return result.rows.length > 0 && String(result.rows[0].contributor_id) === String(userId);
}

function generateStoragePath(subjectId, offeringId, unitId, filename) {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (unitId) {
    return `${subjectId}/${offeringId}/${unitId}/${timestamp}-${sanitizedFilename}`;
  }
  return `${subjectId}/${offeringId}/${timestamp}-${sanitizedFilename}`;
}

// ============================================================================
// ROUTES
// ============================================================================

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5100"],
  credentials: true
}));

// DIAGNOSTIC PUBLIC ENDPOINTS
app.get('/health-public', (req, res) => res.json({ success: true, message: 'Public endpoint is reachable' }));

app.get(['/courses', '/api/courses'], async (req, res) => {
  console.log('[API DEBUG] Public Fetch Initiated: /courses');
  try {
    const result = await pool.query(`
      SELECT id, code, name, degree_type, department
      FROM courses
      ORDER BY created_at DESC
    `);
    console.log(`[API DEBUG] Found ${result.rows.length} courses`);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[API DEBUG] Error fetching courses:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});



app.use("/", meRouter);
app.use('/api/faculty', facultyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', aiRoutes);
app.use('/api/notifications', notificationRoutes);



app.get('/resources', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id, r.title, r.description, r.resource_type, r.content_type,
        r.contributor_id, r.external_url, r.storage_path, r.created_at,
        r.is_verified, r.verified_at, r.ai_summary,
        s.code AS subject_code, s.name AS subject_name, s.course_id,
        c.name AS course_name, ay.start_year, ay.end_year, u.unit_number,
        usr.role AS contributor_type, usr.is_verified AS contributor_is_verified,
        faculty.full_name AS faculty_name
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN subject_offerings so ON r.subject_offering_id = so.id
      LEFT JOIN academic_years ay ON so.academic_year_id = ay.id
      LEFT JOIN units u ON r.unit_id = u.id
      JOIN users usr ON r.contributor_id = usr.id
      LEFT JOIN users faculty ON so.faculty_id = faculty.id
      WHERE 
        r.visibility = 'public' 
        OR r.visibility IS NULL
        OR (r.visibility = 'private' AND $1 = true)
        OR (r.visibility = 'faculty' AND $2 = true)
        OR r.contributor_id = $3
      ORDER BY r.created_at DESC
    `;
    const isVerified = req.user?.is_verified === true || req.user?.role === 'admin';
    const isFacultyOrAdmin = req.user?.role === 'faculty' || req.user?.role === 'admin';
    const result = await pool.query(query, [isVerified, isFacultyOrAdmin, req.user?.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch resources' });
  }
});

app.get('/resources/latest', authMiddleware, async (req, res) => {
  try {
    const query = `
      SELECT 
        r.id, r.title, r.description, r.resource_type, r.content_type,
        r.external_url, r.storage_path, r.created_at, r.ai_summary,
        s.code AS subject_code, s.name AS subject_name,
        ay.start_year, ay.end_year, u.unit_number,
        usr.role AS contributor_type, usr.is_verified AS contributor_is_verified,
        faculty.full_name AS faculty_name
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      LEFT JOIN subject_offerings so ON r.subject_offering_id = so.id
      LEFT JOIN academic_years ay ON so.academic_year_id = ay.id
      LEFT JOIN units u ON r.unit_id = u.id
      JOIN users usr ON r.contributor_id = usr.id
      LEFT JOIN users faculty ON so.faculty_id = faculty.id
      WHERE 
        r.visibility = 'public' 
        OR r.visibility IS NULL
        OR (r.visibility = 'private' AND $1 = true)
        OR (r.visibility = 'faculty' AND $2 = true)
        OR r.contributor_id = $3
      ORDER BY r.created_at DESC
      LIMIT 3
    `;
    const isVerified = req.user?.is_verified === true || req.user?.role === 'admin';
    const isFacultyOrAdmin = req.user?.role === 'faculty' || req.user?.role === 'admin';
    const result = await pool.query(query, [isVerified, isFacultyOrAdmin, req.user?.id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching latest resources:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch latest resources' });
  }
});

app.get('/resources/my', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const query = `
      SELECT 
        r.id, r.title, r.description, r.resource_type, r.content_type,
        r.contributor_id, r.external_url, r.storage_path, r.created_at,
        r.is_verified, r.verified_at, r.ai_summary,
        s.code AS subject_code, s.name AS subject_name, s.course_id,
        c.name AS course_name, ay.start_year, ay.end_year, u.unit_number,
        usr.role AS contributor_type, usr.is_verified AS contributor_is_verified,
        faculty.full_name AS faculty_name
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN subject_offerings so ON r.subject_offering_id = so.id
      LEFT JOIN academic_years ay ON so.academic_year_id = ay.id
      LEFT JOIN units u ON r.unit_id = u.id
      JOIN users usr ON r.contributor_id = usr.id
      LEFT JOIN users faculty ON so.faculty_id = faculty.id
      WHERE r.contributor_id = $1
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching my resources:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your resources' });
  }
});

app.get('/resources/signed-url/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, content_type, storage_path FROM resources WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    const resource = result.rows[0];
    if (resource.content_type !== 'file') {
      return res.status(400).json({ success: false, error: 'Resource is not a file' });
    }
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('resources')
      .createSignedUrl(resource.storage_path, 300);
    if (signedUrlError) {
      throw new Error(`Failed to generate signed URL: ${signedUrlError.message}`);
    }
    res.json({ success: true, signedUrl: signedUrlData.signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate signed URL' });
  }
});

app.get('/resources/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        r.id, r.title, r.description, r.resource_type, r.content_type,
        r.contributor_id, r.external_url, r.storage_path, r.created_at,
        r.subject_offering_id, r.ai_summary, r.visibility,
        s.id AS subject_id, s.code AS subject_code, s.name AS subject_name, s.course_id,
        c.name AS course_name, ay.start_year, ay.end_year, u.unit_number,
        usr.role AS contributor_type, usr.is_verified AS contributor_is_verified,
        faculty.full_name AS faculty_name
      FROM resources r
      JOIN subjects s ON r.subject_id = s.id
      JOIN courses c ON s.course_id = c.id
      LEFT JOIN subject_offerings so ON r.subject_offering_id = so.id
      LEFT JOIN academic_years ay ON so.academic_year_id = ay.id
      LEFT JOIN units u ON r.unit_id = u.id
      JOIN users usr ON r.contributor_id = usr.id
      LEFT JOIN users faculty ON so.faculty_id = faculty.id
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    // Refresh access timestamp for the summary
    pool.query('UPDATE resources SET summary_last_accessed_at = NOW() WHERE id = $1', [id])
      .catch(err => console.error('Error updating summary access time:', err));

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching resource by id:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch resource' });
  }
});

app.post('/resources/:id/summarize', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Fetch resource details
    const result = await pool.query(
      'SELECT id, content_type, storage_path, external_url, ai_summary FROM resources WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }

    const resource = result.rows[0];

    // If summary already exists, return it and refresh its access timestamp
    if (resource.ai_summary) {
      pool.query('UPDATE resources SET summary_last_accessed_at = NOW() WHERE id = $1', [id])
        .catch(err => console.error('Error updating summary access time:', err));
      return res.json({ success: true, summary: resource.ai_summary });
    }

    let textForAi = "";

    if (resource.content_type === 'file') {
      if (!resource.storage_path.toLowerCase().endsWith('.pdf')) {
        return res.status(400).json({ success: false, error: 'Only PDF files can be summarized currently' });
      }

      // 2. Download from Supabase
      const { data: fileBuffer, error: downloadError } = await supabase.storage
        .from('resources')
        .download(resource.storage_path);

      if (downloadError) throw new Error(`Failed to download file: ${downloadError.message}`);

      // 3. Extract text
      const buffer = Buffer.from(await fileBuffer.arrayBuffer());
      textForAi = await extractTextFromPDF(buffer);
    } else {
      return res.status(400).json({ success: false, error: 'Only uploaded PDF files can be summarized' });
    }

    if (!textForAi || textForAi.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'No text could be extracted from this PDF' });
    }

    // 4. Generate summary
    const summary = await generateSummary(textForAi);

    // 5. Save to DB and update access timestamp
    await pool.query(
      'UPDATE resources SET ai_summary = $1, summary_last_accessed_at = NOW() WHERE id = $2',
      [summary, id]
    );

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate summary' });
  }
});


// Public courses moved to top of index.js

app.get('/subjects', authMiddleware, async (req, res) => {
  try {
    const { course_id } = req.query;
    if (!course_id) {
      return res.status(400).json({ success: false, error: 'course_id is required' });
    }
    const result = await pool.query(`
      SELECT id, code, name, course_id
      FROM subjects
      WHERE course_id = $1
      ORDER BY created_at DESC
    `, [course_id]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subjects' });
  }
});

app.get('/academic-years', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, start_year, end_year
      FROM academic_years
      ORDER BY start_year DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch academic years' });
  }
});

app.get('/units', authMiddleware, async (req, res) => {
  try {
    const { subject_id, academic_year_id } = req.query;
    if (!subject_id || !academic_year_id) {
      return res.status(400).json({ success: false, error: 'subject_id and academic_year_id are required' });
    }
    const offeringResult = await pool.query(
      `SELECT id FROM subject_offerings WHERE subject_id = $1 AND academic_year_id = $2`,
      [subject_id, academic_year_id]
    );
    if (offeringResult.rows.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const subjectOfferingId = offeringResult.rows[0].id;
    const unitsResult = await pool.query(
      `SELECT id, unit_number FROM units WHERE subject_offering_id = $1 ORDER BY unit_number ASC`,
      [subjectOfferingId]
    );
    res.json({ success: true, data: unitsResult.rows });
  } catch (error) {
    console.error('Error fetching units:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch units' });
  }
});

app.get('/faculty', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id, u.full_name, fp.education, fp.research_interests, fp.phd_topic,
        ARRAY_AGG(DISTINCT s.name) AS subjects
      FROM users u
      LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
      LEFT JOIN subject_offerings so ON u.id = so.faculty_id
      LEFT JOIN subjects s ON so.subject_id = s.id
      WHERE u.role = 'faculty'
      GROUP BY u.id, fp.education, fp.research_interests, fp.phd_topic
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

app.post('/resources', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      title, description, subject_code, start_year, end_year,
      unit_number, external_url, resource_type,
    } = req.body;

    if (!title || !description || !subject_code || !start_year || !end_year || !external_url || !resource_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, subject_code, start_year, end_year, external_url, resource_type'
      });
    }

    await client.query('BEGIN');
    const subject = await resolveSubject(subject_code);
    const academicYearId = await resolveAcademicYear(parseInt(start_year), parseInt(end_year));
    const offering = await resolveSubjectOffering(subject.id, academicYearId);
    let unitId = null;
    if (unit_number) {
      unitId = await resolveUnit(offering.id, parseInt(unit_number));
    }

    // Auto-verify if the uploader is a verified user; otherwise send to admin queue
    const autoVerified = req.user.is_verified === true;

    const insertQuery = `
      INSERT INTO resources (
        id, subject_id, subject_offering_id, unit_id, title, description,
        resource_type, content_type, external_url, contributor_id,
        is_verified, verified_by, verified_at
      ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      subject.id, offering.id, unitId, title, description,
      resource_type, 'external_link', external_url, req.user.id,
      autoVerified,
      autoVerified ? req.user.id : null,
      autoVerified ? new Date() : null,
    ]);
    // NOTIFICATION LOGIC
    if (autoVerified) {
      try {
        const resourceId = result.rows[0].id;
        // Fetch context for notification
        const contextRes = await client.query(
          `SELECT u.full_name AS contributor_name, s.name AS subject_name, s.course_id
           FROM users u, subjects s
           WHERE u.id = $1 AND s.id = $2`,
          [req.user.id, subject.id]
        );
        const ctx = contextRes.rows[0] || {};
        
        notifyCourseSubscribers({
          courseId: ctx.course_id,
          resourceId: resourceId,
          title: 'New Resource Uploaded',
          message: `A new ${resource_type.replace('_', ' ')} titled "${title}" has been uploaded to ${ctx.subject_name}.`,
          excludeUserId: req.user.id
        }).catch(err => console.error('Notification failed:', err));

      } catch (ctxErr) {
        console.error('Notification context fetch failed:', ctxErr);
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating external link resource:', error);
    const statusCode = error.message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, error: error.message || 'Failed to create resource' });
  } finally {
    client.release();
  }
});


app.post('/resources/file', authMiddleware, (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  const fields = {};
  let fileData = null;
  let filename = null;
  let mimeType = null;

  busboy.on('field', (fieldname, value) => { fields[fieldname] = value; });

  busboy.on('file', (fieldname, file, info) => {
    filename = info.filename;
    mimeType = info.mimeType;
    const chunks = [];
    file.on('data', (chunk) => chunks.push(chunk));
    file.on('end', () => { fileData = Buffer.concat(chunks); });
  });

  busboy.on('finish', async () => {
    const client = await pool.connect();
    let uploadedPath = null;

    try {
      const { title, description, subject_code, start_year, end_year, unit_number, resource_type, visibility } = fields;

      if (!title || !description || !subject_code || !start_year || !end_year) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: title, description, subject_code, start_year, end_year'
        });
      }
      if (!fileData || !filename) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }

      await client.query('BEGIN');
      const subject = await resolveSubject(subject_code);
      const academicYearId = await resolveAcademicYear(parseInt(start_year), parseInt(end_year));
      const offering = await resolveSubjectOffering(subject.id, academicYearId);
      let unitId = null;
      if (unit_number) {
        unitId = await resolveUnit(offering.id, parseInt(unit_number));
      }

      const storagePath = generateStoragePath(subject.id, offering.id, unitId, filename);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resources')
        .upload(storagePath, fileData, { contentType: mimeType, upsert: false });

      if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);
      
      // Track that the file has been uploaded to Supabase
      uploadedPath = storagePath;

      // Auto-verify if the uploader is a verified user; otherwise send to admin queue
      const autoVerified = req.user.is_verified === true;

      const insertQuery = `
        INSERT INTO resources (
          id, subject_id, subject_offering_id, unit_id, title, description,
          resource_type, content_type, storage_path, contributor_id,
          is_verified, verified_by, verified_at, visibility
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;
      const result = await client.query(insertQuery, [
        subject.id, offering.id, unitId, title.trim(), description.trim(),
        resource_type, 'file', storagePath, req.user.id,
        autoVerified,
        autoVerified ? req.user.id : null,
        autoVerified ? new Date() : null,
        visibility || 'public'
      ]);

      await client.query('COMMIT');

      // 🔥 NOTIFICATION LOGIC: Notify subscribers if verified immediately
      if (autoVerified) {
        try {
          const resource = result.rows[0];
          // Fetch context for notification
          const contextRes = await client.query(
            `SELECT u.full_name AS contributor_name, s.name AS subject_name, s.course_id
             FROM users u, subjects s
             WHERE u.id = $1 AND s.id = $2`,
            [resource.contributor_id, resource.subject_id]
          );
          const ctx = contextRes.rows[0] || {};
          
          notifyCourseSubscribers({
            courseId: ctx.course_id,
            resourceId: resource.id,
            title: 'New Resource Uploaded',
            message: `A new ${resource_type.replace('_', ' ')} titled "${resource.title}" has been uploaded to ${ctx.subject_name}.`,
            excludeUserId: req.user.id
          }).catch(err => console.error('Notification failed:', err));

          console.log(`[Notifications] Auto-triggered for resource ${resource.id}`);
        } catch (ctxErr) {
          console.error('Notification context fetch failed:', ctxErr);
        }
      }


      res.status(201).json({ success: true, data: result.rows[0] });

    } catch (error) {
      await client.query('ROLLBACK');
      
      // Cleanup: Delete the file from Supabase if the DB transaction failed
      if (uploadedPath) {
        console.log(`Cleaning up orphaned file from storage: ${uploadedPath}`);
        await supabase.storage.from('resources').remove([uploadedPath]);
      }

      console.error('Error uploading file resource:', error);
      res.status(400).json({ success: false, error: error.message || 'Failed to upload file' });
    } finally {
      client.release();
    }
  });

  busboy.on('error', (error) => {
    console.error('Busboy error:', error);
    res.status(500).json({ success: false, error: 'File upload failed' });
  });

  req.pipe(busboy);
});

app.put('/resources/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { 
      title, description, resource_type, visibility, 
      external_url, subject_code, start_year, end_year, unit_number 
    } = req.body;

    const userIsAdmin = await isAdmin(req.user.id, client);
    const userIsOwner = await isResourceOwner(id, req.user.id, client);

    if (!userIsAdmin && !userIsOwner) {
      return res.status(403).json({ success: false, error: 'You do not have permission to update this resource' });
    }

    await client.query('BEGIN');

    // Fetch existing resource to understand state
    const existingResult = await client.query('SELECT * FROM resources WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    const existingResource = existingResult.rows[0];

    const updates = [];
    const values = [];
    let paramCount = 1;

    const addUpdate = (field, value) => {
      updates.push(`${field} = $${paramCount}`);
      values.push(value);
      paramCount++;
    };

    let finalSubjectId = existingResource.subject_id;
    let contentChanged = false;

    if (title && title.trim() !== existingResource.title) {
      addUpdate('title', title.trim());
      contentChanged = true;
    }
    if (description !== undefined && description.trim() !== existingResource.description) {
      addUpdate('description', description.trim());
      contentChanged = true;
    }
    if (resource_type) addUpdate('resource_type', resource_type);
    if (visibility) addUpdate('visibility', visibility);

    // Metadata Resolution
    if (subject_code) {
      const subject = await resolveSubject(subject_code);
      finalSubjectId = subject.id;
      if (finalSubjectId !== existingResource.subject_id) {
        addUpdate('subject_id', finalSubjectId);
      }
    }
    
    if (start_year && end_year) {
      const academicYearId = await resolveAcademicYear(parseInt(start_year), parseInt(end_year));
      const offering = await resolveSubjectOffering(finalSubjectId, academicYearId);
      if (offering.id !== existingResource.subject_offering_id) {
        addUpdate('subject_offering_id', offering.id);
      }
    }

    if (unit_number !== undefined && unit_number !== null && unit_number !== '') {
      // Resolve unit_id using the current (or newly resolved) offering
      const offeringId = existingResource.subject_offering_id;
      if (offeringId) {
        try {
          const unitId = await resolveUnit(offeringId, parseInt(unit_number));
          if (unitId !== existingResource.unit_id) {
            addUpdate('unit_id', unitId);
          }
        } catch (e) {
          // Unit may not exist for that offering — skip silently
        }
      }
    } else if (unit_number === '') {
      // Explicitly cleared — set to null
      if (existingResource.unit_id !== null) addUpdate('unit_id', null);
    }

    // CONVERSION LOGIC: Switch to External Link
    if (external_url && external_url.trim() !== existingResource.external_url) {
      addUpdate('external_url', external_url.trim());
      addUpdate('content_type', 'external_link');
      contentChanged = true;
      
      // Definitively clear and delete existing file if present
      if (existingResource.storage_path) {
        await supabase.storage.from('resources').remove([existingResource.storage_path]);
        addUpdate('storage_path', null);
      }
    }

    if (contentChanged) {
      addUpdate('ai_summary', null);
    }

    if (updates.length === 0) {
      await client.query('COMMIT');
      return res.json({ success: true, data: existingResource });
    }

    values.push(id);
    const updateQuery = `UPDATE resources SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await client.query(updateQuery, values);

    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating resource:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to update resource' });
  } finally {
    client.release();
  }
});

app.put('/resources/file/:id', authMiddleware, (req, res) => {
  const busboy = Busboy({ headers: req.headers });
  const fields = {};
  let fileData = null;
  let filename = null;
  let mimeType = null;

  busboy.on('field', (fieldname, value) => { fields[fieldname] = value; });

  busboy.on('file', (fieldname, file, info) => {
    filename = info.filename;
    mimeType = info.mimeType;
    const chunks = [];
    file.on('data', (chunk) => chunks.push(chunk));
    file.on('end', () => { fileData = Buffer.concat(chunks); });
  });

  busboy.on('finish', async () => {
    const client = await pool.connect();
    let newStoragePath = null;
    let oldStoragePath = null;

    try {
      const { id } = req.params;
      const { title, description, subject_code, start_year, end_year, unit_number, resource_type, visibility } = fields;

      const userIsAdmin = await isAdmin(req.user.id, client);
      const userIsOwner = await isResourceOwner(id, req.user.id, client);
      if (!userIsAdmin && !userIsOwner) {
        return res.status(403).json({ success: false, error: 'Permission denied' });
      }

      await client.query('BEGIN');
      const subject = await resolveSubject(subject_code);
      const academicYearId = await resolveAcademicYear(parseInt(start_year), parseInt(end_year));
      const offering = await resolveSubjectOffering(subject.id, academicYearId);
      let unitId = null;
      if (unit_number) {
        unitId = await resolveUnit(offering.id, parseInt(unit_number));
      }

      const existingResult = await client.query('SELECT storage_path FROM resources WHERE id = $1', [id]);
      if (existingResult.rows.length === 1) {
        oldStoragePath = existingResult.rows[0].storage_path;
      }

      let storagePath = oldStoragePath;
      if (fileData && filename) {
        // Upload NEW file first
        storagePath = generateStoragePath(subject.id, offering.id, unitId, filename);
        const { error: uploadError } = await supabase.storage
          .from('resources')
          .upload(storagePath, fileData, { contentType: mimeType, upsert: false });
        
        if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);
        newStoragePath = storagePath;
      }

      const updates = [
        'title = $1', 'description = $2', 'subject_id = $3',
        'subject_offering_id = $4', 'unit_id = $5', 'resource_type = $6',
        'content_type = $7', 'external_url = $8', 'visibility = $9',
        'ai_summary = NULL'
      ];
      const values = [
        title, description, subject.id, offering.id, unitId, resource_type,
        'file', null, visibility || 'public'
      ];

      if (newStoragePath) {
        updates.push(`storage_path = $${values.length + 1}`);
        values.push(newStoragePath);
      }

      values.push(id);
      const result = await client.query(
        `UPDATE resources SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error('Resource not found');
      }

      await client.query('COMMIT');

      // SUCCESS: Now delete OLD file if it was replaced
      if (newStoragePath && oldStoragePath) {
        console.log(`Cleaning up old file after successful update: ${oldStoragePath}`);
        await supabase.storage.from('resources').remove([oldStoragePath]);
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      await client.query('ROLLBACK');

      // FAILURE: Cleanup the NEW file if we uploaded one
      if (newStoragePath) {
        console.log(`Cleaning up failed new upload: ${newStoragePath}`);
        await supabase.storage.from('resources').remove([newStoragePath]);
      }

      console.error('Error updating file resource:', error);
      res.status(400).json({ success: false, error: error.message || 'Update failed' });
    } finally {
      client.release();
    }
  });

  busboy.on('error', (error) => {
    console.error('Busboy error:', error);
    res.status(500).json({ success: false, error: 'File processing failed' });
  });

  req.pipe(busboy);
});

app.delete('/resources/:id', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    
    // Pass 'client' to helpers to prevent pool deadlock
    const userIsAdmin = await isAdmin(req.user.id, client);
    const userIsOwner = await isResourceOwner(id, req.user.id, client);

    if (!userIsAdmin && !userIsOwner) {
      return res.status(403).json({ success: false, error: 'Permission denied' });
    }

    const fetchResult = await client.query('SELECT * FROM resources WHERE id = $1', [id]);
    if (fetchResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Resource not found' });
    }
    const resource = fetchResult.rows[0];

    await client.query('BEGIN');

    if (resource.content_type === 'file' && resource.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('resources')
        .remove([resource.storage_path]);
      if (storageError) {
        console.error('Storage delete failed (non-fatal):', storageError.message);
      }
    }

    const deleteResult = await client.query('DELETE FROM resources WHERE id = $1 RETURNING id', [id]);
    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ success: false, error: 'Database delete failed' });
    }

    await client.query('COMMIT');
    return res.json({ success: true });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete resource error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete resource' });
  } finally {
    client.release();
  }
});

app.get("/whoami", authMiddleware, (req, res) => {
  res.json(req.user);
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================================================
// BACKGROUND TASKS
// ============================================================================

/**
 * Automatically clears AI summaries that haven't been accessed for more than 2 days.
 * Runs every 6 hours.
 */
function startSummaryCleanupTask() {
  const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

  setInterval(async () => {
    console.log('[Cleanup Task] Checking for stale AI summaries...');
    try {
      const result = await pool.query(`
        UPDATE resources 
        SET ai_summary = NULL 
        WHERE ai_summary IS NOT NULL 
        AND summary_last_accessed_at < NOW() - INTERVAL '2 days'
        RETURNING id
      `);
      if (result.rowCount > 0) {
        console.log(`[Cleanup Task] Successfully cleared ${result.rowCount} stale summaries.`);
      }
    } catch (error) {
      console.error('[Cleanup Task] Error clearing stale summaries:', error);
    }
  }, CLEANUP_INTERVAL);
}

// Start background services
startSummaryCleanupTask();

// ============================================================================
// SERVER STARTUP
// ============================================================================

const PORT = process.env.PORT || 3000;

// Attach Socket.IO to the shared HTTP server before listening
initSocketIO(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`[Socket.IO] WebSocket server ready on port ${PORT}`);
});

export default app;