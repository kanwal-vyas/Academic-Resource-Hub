// backend/index.js
import config from './config.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import pool from './db.js';

// Route Imports
import facultyRoutes from './routes/facultyRoutes.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import resourceRoutes from './routes/resourceRoutes.js';
import courseRoutes from './routes/courseRoutes.js';

// Background Tasks
import { startSummaryTask } from './tasks/summaryTask.js';

// Socket.IO & Middleware
import { initSocketIO } from './socket.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const server = http.createServer(app);

// --- GLOBAL MIDDLEWARE ---
app.use(cors({
  origin: config.corsOrigins,
  credentials: true
}));
app.use(express.json());

app.get(['/academic-years', '/api/academic-years'], authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, start_year, end_year FROM academic_years ORDER BY start_year DESC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get(['/subjects', '/api/subjects'], authMiddleware, async (req, res) => {
  const { course_id } = req.query;
  try {
    let query = `
      SELECT s.id, s.code, s.name, s.course_id, c.name AS course_name, s.created_at
      FROM subjects s JOIN courses c ON s.course_id = c.id
    `;
    const params = [];
    if (course_id) { query += ` WHERE s.course_id = $1`; params.push(course_id); }
    query += ` ORDER BY s.name ASC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching subjects:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get(['/units', '/api/units'], authMiddleware, async (req, res) => {
  const { offering_id, subject_id, academic_year_id } = req.query;
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
    
    if (offering_id) {
      query += ` WHERE u.subject_offering_id = $1`;
      params.push(offering_id);
    } else if (subject_id && academic_year_id) {
      query += ` WHERE so.subject_id = $1 AND so.academic_year_id = $2`;
      params.push(subject_id, academic_year_id);
    }
    
    query += ` ORDER BY u.unit_number ASC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching units:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Request Logger (Diagnostic)
app.use((req, res, next) => {
  console.log(`[API DEBUG] ${req.method} ${req.url}`);
  next();
});

// --- CORE ROUTES (Restored to index.js for reliability) ---

// Profile / Me
const getProfile = (req, res) => {
  const { id, email, role, is_verified, course_id, preferred_course } = req.user;
  res.json({ id, email, role, is_verified, course_id, preferred_course });
};

app.get('/me', authMiddleware, getProfile);
app.get('/api/me', authMiddleware, getProfile);
app.get('/whoami', authMiddleware, getProfile);

// Onboarding
app.put(['/me/onboard', '/api/me/onboard'], authMiddleware, async (req, res) => {
  const { course_id, preferred_course } = req.body;
  try {
    const result = await pool.query(
      "UPDATE users SET course_id = $1, preferred_course = $2 WHERE id = $3 RETURNING *",
      [course_id || null, preferred_course || null, req.user.id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- MODULAR ROUTES ---

app.use(['/auth', '/api/auth'], authRoutes);
app.use(['/resources', '/api/resources'], resourceRoutes);
app.use(['/faculty', '/api/faculty'], facultyRoutes);
app.use(['/admin', '/api/admin'], adminRoutes);
app.use(['/chat', '/api/chat'], aiRoutes);
app.use(['/notifications', '/api/notifications'], notificationRoutes);
app.use(['/courses', '/api/courses'], courseRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

initSocketIO(server);
startSummaryTask();

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`[Socket.IO] WebSocket server ready`);
});

export default app;