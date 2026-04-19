import { createClient } from "@supabase/supabase-js";
import pool from '../db.js';
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


function computeRole(email) {
  if (!email) return "student";

  if (email.endsWith("@student.rru.ac.in")) {
    const prefix = email.split("@")[0];
    const digits = prefix.match(/^(\d{2})/);
    if (digits) {
      const admissionYear = 2000 + parseInt(digits[1], 10);
      const currentYear = new Date().getFullYear();
      if (currentYear - admissionYear >= 5) {
        return "alumni";
      }
    }
    return "student";
  }

  if (email.endsWith("@rru.ac.in")) {
    return "faculty";
  }

  return "student";
}

export async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);


    if (error || !data.user) {
      return res.status(401).json({ success: false, error: "Invalid token" });
    }

    const { id, email } = data.user;

    let dbUser;
    try {
      const userResult = await pool.query(
        "SELECT role, is_verified, is_suspended, course_id, preferred_course FROM users WHERE id = $1",
        [id]
      );

      if (userResult.rows.length === 0) {
        // AUTO-CREATE: If user exists in Supabase but not in our DB, add them.
        // This handles regular graduates/students who sign up via frontend.
        const meta = data.user.user_metadata || {};
        const role = computeRole(email);
        const name = meta.full_name || 'New User';
        const courseId = meta.course_id || null;
        const preferredCourse = meta.preferred_course || null;
        const isVerified = email.endsWith("@rru.ac.in") || email.endsWith("@student.rru.ac.in");

        const insertRes = await pool.query(
          `INSERT INTO users (id, email, full_name, role, is_verified, course_id, preferred_course)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING role, is_verified, is_suspended, course_id, preferred_course`,
          [id, email, name, role, isVerified, courseId, preferredCourse]
        );
        dbUser = insertRes.rows[0];
        console.log(`[Auth] Auto-created DB record for user: ${email}`);
      } else {
        dbUser = userResult.rows[0];
      }

      if (dbUser.is_suspended) {
        return res.status(403).json({ success: false, error: "Your account has been suspended by an administrator." });
      }
    } catch (dbErr) {
      console.error("DB FETCH ERROR:", dbErr.message);
      return res.status(500).json({ success: false, error: "Database error during authentication" });
    }

    const computedRole = computeRole(email);

    if (dbUser.role !== "admin" && dbUser.role !== computedRole) {
      try {
        await pool.query(
          "UPDATE users SET role = $1 WHERE id = $2",
          [computedRole, id]
        );
        dbUser.role = computedRole;
      } catch (updateErr) {
        console.error("DB ROLE UPDATE ERROR:", updateErr.message);
        return res.status(500).json({ success: false, error: "Database error during role update" });
      }
    }

    // SYNC METADATA: If user has course info in Supabase but not in DB, sync it.
    const meta = data.user.user_metadata || {};
    const metaCourseId = meta.course_id || null;
    const metaPrefCourse = meta.preferred_course || null;

    if ((metaCourseId && !dbUser.course_id) || (metaPrefCourse && !dbUser.preferred_course)) {
      try {
        await pool.query(
          "UPDATE users SET course_id = COALESCE(course_id, $1), preferred_course = COALESCE(preferred_course, $2) WHERE id = $3",
          [metaCourseId, metaPrefCourse, id]
        );
      } catch (updateErr) {
        console.error("DB COURSE SYNC ERROR:", updateErr.message);
      }
    }

    req.user = {
      id,
      email,
      role: dbUser.role,
      is_verified: dbUser.is_verified,
      course_id: dbUser.course_id,
      preferred_course: dbUser.preferred_course
    };


    next();
  } catch (err) {
    console.error("AUTH ERROR:", err.message);
    return res.status(401).json({ success: false, error: "Invalid or missing token" });
  }
}