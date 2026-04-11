// routes/me.js
import express from "express";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/me", authMiddleware, (req, res) => {
  const { id, email, role, is_verified } = req.user;
  return res.json({ id, email, role, is_verified });
});

export default router;