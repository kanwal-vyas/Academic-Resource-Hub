// backend/utils/dbHelpers.js
import pool from '../db.js';

/**
 * Resolves a subject code to a subject record.
 */
export async function resolveSubject(subjectCode) {
  const res = await pool.query('SELECT * FROM subjects WHERE code = $1', [subjectCode]);
  if (res.rows.length === 0) throw new Error(`Subject with code ${subjectCode} not found`);
  return res.rows[0];
}

/**
 * Resolves start/end years to an academic_years record ID.
 */
export async function resolveAcademicYear(startYear, endYear) {
  const res = await pool.query(
    'SELECT id FROM academic_years WHERE start_year = $1 AND end_year = $2',
    [startYear, endYear]
  );
  if (res.rows.length === 0) throw new Error(`Academic year ${startYear}-${endYear} not found`);
  return res.rows[0].id;
}

/**
 * Resolves subject and academic year to an offering ID.
 */
export async function resolveSubjectOffering(subjectId, academicYearId) {
  const res = await pool.query(
    'SELECT id FROM subject_offerings WHERE subject_id = $1 AND academic_year_id = $2',
    [subjectId, academicYearId]
  );
  if (res.rows.length === 0) throw new Error('Subject offering not found for this academic year');
  return res.rows[0];
}

/**
 * Resolves unit number to a units record ID.
 */
export async function resolveUnit(offeringId, unitNumber) {
  const res = await pool.query(
    'SELECT id FROM units WHERE subject_offering_id = $1 AND unit_number = $2',
    [offeringId, unitNumber]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0].id;
}

/**
 * Checks if a user is an administrator.
 */
export async function isAdmin(userId, client = pool) {
  const res = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
  return res.rows.length > 0 && res.rows[0].role === 'admin';
}

/**
 * Checks if a user is the owner (contributor) of a resource.
 */
export async function isResourceOwner(resourceId, userId, client = pool) {
  const res = await client.query('SELECT contributor_id FROM resources WHERE id = $1', [resourceId]);
  return res.rows.length > 0 && res.rows[0].contributor_id === userId;
}

/**
 * Generates a storage path for Supabase files.
 */
export function generateStoragePath(subjectId, offeringId, unitId, filename) {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const pathParts = ['resources', subjectId, offeringId];
  if (unitId) pathParts.push(unitId);
  pathParts.push(sanitizedFilename);
  return pathParts.join('/');
}
