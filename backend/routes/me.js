// routes/me.js
import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import pool from "../db.js";


const router = express.Router();

router.get("/", authMiddleware, (req, res) => {
  const { id, email, role, is_verified, course_id, preferred_course } = req.user;
  return res.json({ id, email, role, is_verified, course_id, preferred_course });
});

router.put("/onboard", authMiddleware, async (req, res) => {
  const { course_id, preferred_course } = req.body;
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET course_id = $1, preferred_course = $2 
       WHERE id = $3 
       RETURNING id, course_id, preferred_course`,
      [course_id || null, preferred_course || null, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Onboarding update error:", err);
    res.status(500).json({ success: false, error: "Failed to update course selection" });
  }
});

export default router;