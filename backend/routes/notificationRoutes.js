import express from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Fetch all notifications for the authenticated user, newest first.
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT n.*, r.title as resource_title
       FROM notifications n
       LEFT JOIN resources r ON n.resource_id = r.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read.
 */
router.patch('/:id/read', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the user.
 */
router.patch('/read-all', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a specific notification.
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
