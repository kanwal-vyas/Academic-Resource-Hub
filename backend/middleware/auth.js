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
        "SELECT role, is_verified, is_suspended FROM users WHERE id = $1",
        [id]
      );

      if (userResult.rows.length === 0) {
        return res.status(403).json({ success: false, error: "User not found in system" });
      }

      dbUser = userResult.rows[0];

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

    const shouldBeAutoVerified = email.endsWith("@rru.ac.in") || email.endsWith("@student.rru.ac.in");
    
    if (shouldBeAutoVerified && dbUser.is_verified !== true) {
      try {
        await pool.query(
          "UPDATE users SET is_verified = true WHERE id = $1",
          [id]
        );
        dbUser.is_verified = true;
      } catch (updateErr) {
        console.error("DB VERIFIED UPDATE ERROR:", updateErr.message);
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
    return res.status(401).json({ success: false, error: "Invalid or missing token" });
  }
}