import pool from '../db.js';
import { getIO } from '../socket.js';

/**
 * Creates persistent notification records for all users in a specific course
 * and emits a real-time event to the course room.
 * 
 * @param {Object} params
 * @param {string} params.courseId - The ID of the course to notify
 * @param {string} params.resourceId - The ID of the uploaded resource
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} [params.excludeUserId] - Optional user ID to exclude (e.g. the uploader)
 */
export async function notifyCourseSubscribers({ courseId, resourceId, title, message, excludeUserId }) {
  if (!courseId) return;

  try {
    // 1. Find all users enrolled in this course
    const usersRes = await pool.query(
      `SELECT id FROM users WHERE course_id = $1 ${excludeUserId ? 'AND id != $2' : ''}`,
      excludeUserId ? [courseId, excludeUserId] : [courseId]
    );

    const userIds = usersRes.rows.map(r => r.id);

    if (userIds.length > 0) {
      // 2. Create persistent notification records in bulk
      const values = [];
      const placeholders = [];
      
      userIds.forEach((uid, index) => {
        const offset = index * 4;
        values.push(uid, resourceId, title, message);
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
      });

      await pool.query(
        `INSERT INTO notifications (user_id, resource_id, title, message) VALUES ${placeholders.join(', ')}`,
        values
      );

      // 3. Emit real-time socket event to the course room
      getIO().to(`course:${courseId}`).emit('notification:new', {
        title,
        message,
        resourceId,
        created_at: new Date().toISOString()
      });

      console.log(`[Notifications] Sent to ${userIds.length} users in Course ${courseId}`);
    }
  } catch (err) {
    console.error('[Notifications] Error notifying course subscribers:', err);
  }
}
