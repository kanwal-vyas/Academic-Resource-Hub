// backend/config.js
import dotenv from 'dotenv';
dotenv.config();

/**
 * List of environment variables that are critical for the application to function.
 * If any of these are missing, the server will log an error and exit.
 */
const requiredEnvVars = [
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GEMINI_API_KEY'
];

const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingVars.length > 0) {
  console.error('\n❌ FATAL ERROR: MISSING REQUIRED ENVIRONMENT VARIABLES');
  console.error('──────────────────────────────────────────────────────');
  missingVars.forEach(v => console.error(`   MISSING: ${v}`));
  console.error('──────────────────────────────────────────────────────');
  console.error('Please ensure these variables are defined in your .env file.\n');
  process.exit(1); 
}

export const config = {
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  gemini: {
    primaryKey: process.env.GEMINI_API_KEY,
    allKeys: process.env.GEMINI_API_KEYS 
      ? process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0)
      : [process.env.GEMINI_API_KEY]
  },
  corsOrigins: [
    "http://localhost:5173", 
    "http://localhost:5100"
  ],
  nodeEnv: process.env.NODE_ENV || 'development'
};

export default config;
