import { createClient } from "@supabase/supabase-js";
import pool from '../db.js';
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("SERVICE ROLE KEY EXISTS:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

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
    return res.status(401).json({ error: "Missing token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);

    console.log("AUTH RESULT:", data);
    console.log("AUTH ERROR:", error);

    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { id, email } = data.user;

    let dbUser;
    try {
      const userResult = await pool.query(
        "SELECT role, is_verified FROM users WHERE id = $1",
        [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(403).json({ error: "User not found in system" });
      }

      dbUser = userResult.rows[0];
    } catch (dbErr) {
      console.error("DB FETCH ERROR:", dbErr.message);
      return res.status(500).json({ error: "Database error during authentication" });
    }

    const computedRole = computeRole(email);

    if (dbUser.role !== "admin" && dbUser.role !== computedRole) {
      try {
        await pool.query(
          "UPDATE users SET role = $1 WHERE id = $2",
          [computedRole, id]
        );
        console.log(`ROLE UPDATED: ${dbUser.role} → ${computedRole} for ${email}`);
        dbUser.role = computedRole;
      } catch (updateErr) {
        console.error("DB ROLE UPDATE ERROR:", updateErr.message);
        return res.status(500).json({ error: "Database error during role update" });
      }
    }

    req.user = {
      id,
      email,
      role: dbUser.role,
      is_verified: dbUser.is_verified,
    };

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err.message);
    return res.status(401).json({ error: "Invalid or missing token" });
  }
}