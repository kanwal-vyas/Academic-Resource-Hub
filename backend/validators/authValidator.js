// backend/validators/authValidator.js
import { z } from 'zod';

export const facultyRegisterSchema = z.object({
  email: z.string()
    .email("Invalid email format")
    .endsWith("@rru.ac.in", "Only @rru.ac.in emails are allowed for faculty"),
  
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  
  full_name: z.string()
    .min(2, "Full name is too short")
    .max(100, "Full name is too long"),
  
  department: z.string()
    .min(2, "Department name is required"),
  
  employee_id: z.string()
    .min(2, "Employee ID is required"),
  
  education: z.string().optional().nullable(),
  research_interests: z.string().optional().nullable()
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});
