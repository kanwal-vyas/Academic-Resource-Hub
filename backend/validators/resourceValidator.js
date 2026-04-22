// backend/validators/resourceValidator.js
import { z } from 'zod';

export const resourceSchema = z.object({
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters")
    .trim(),
  
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description cannot exceed 2000 characters")
    .trim(),
  
  subject_code: z.string()
    .min(2, "Invalid subject code")
    .max(20, "Subject code too long")
    .toUpperCase(),
  
  start_year: z.coerce.number()
    .int()
    .min(2000, "Invalid start year")
    .max(2100, "Year out of range"),
  
  end_year: z.coerce.number()
    .int()
    .min(2000, "Invalid end year")
    .max(2100, "Year out of range"),
  
  unit_number: z.coerce.number()
    .int()
    .min(1, "Unit must be at least 1")
    .max(20, "Unit number out of range")
    .optional()
    .nullable(),
  
  resource_type: z.enum([
    'lecture_notes', 
    'question_paper', 
    'research_paper', 
    'project_material', 
    'other'
  ], {
    errorMap: () => ({ message: "Please select a valid resource type" })
  }),
  
  visibility: z.enum(['public', 'private', 'faculty']).default('public'),
  
  external_url: z.string()
    .url("Invalid URL format")
    .regex(/^https?:\/\//, "URL must start with http:// or https://")
    .optional()
    .nullable()
});

/**
 * Validator for file-based resource metadata
 * (File itself is handled by multer/busboy, we validate the text fields)
 */
export const fileResourceSchema = resourceSchema.omit({ external_url: true });
