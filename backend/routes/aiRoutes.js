import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { chatWithAI } from '../utils/ai.js';

const router = express.Router();

/**
 * POST /api/chat
 * Main entry point for the AI Academic Assistant.
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, resourceId, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    // 1. Fetch current resource context if resourceId provided
    let context = null;
    if (resourceId) {
      const resourceRes = await pool.query(`
        SELECT r.id, r.title, r.description, r.resource_type, s.name as subject_name, u.full_name as faculty_name
        FROM resources r
        JOIN subjects s ON r.subject_id = s.id
        LEFT JOIN subject_offerings so ON r.subject_offering_id = so.id
        LEFT JOIN users u ON so.faculty_id = u.id
        WHERE r.id = $1
      `, [resourceId]);
      context = resourceRes.rows[0];
    }

    // 2. Fetch Global Hub Stats (minimal context for conciseness)
    const statsRes = await pool.query('SELECT COUNT(*) FROM resources');
    
    // We only provide counts and basic info to keep it small as requested.
    const globalContext = {
      totalResources: statsRes.rows[0].count
    };

    // 3. Get AI Response
    const aiResponse = await chatWithAI(history, message, context, globalContext);

    // 4. Return the response
    res.json({ 
      success: true, 
      data: {
        id: Date.now(),
        message: aiResponse,
        role: 'model',
        created_at: new Date().toISOString(),
        resource_id: resourceId || null
      } 
    });

  } catch (error) {
    console.error('Error in chat route:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to process chat'
    });
  }
});

export default router;
