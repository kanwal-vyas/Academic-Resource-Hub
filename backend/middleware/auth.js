import { createClient } from "@supabase/supabase-js";
import pool from '../db.js';
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log("SERVICE ROLE KEY EXISTS:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

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

    // Fetch role + verification from public.users
const userResult = await pool.query(
  "SELECT role, is_verified FROM users WHERE id = $1",
  [data.user.id]
);

if (userResult.rows.length === 0) {
  return res.status(403).json({ error: "User not found in system" });
}

req.user = {
  id: data.user.id,
  email: data.user.email,
  role: userResult.rows[0].role,
  is_verified: userResult.rows[0].is_verified,
};

    next();
  } catch (err) {
    console.error("AUTH ERROR:", err.message);
    return res.status(401).json({ error: "Invalid or missing token" });
  }
}
