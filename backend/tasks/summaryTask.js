// backend/tasks/summaryTask.js
import pool from '../db.js';
import { createClient } from '@supabase/supabase-js';
import config from '../config.js';
import { extractTextFromPDF, generateSummary } from '../utils/ai.js';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

/**
 * Background task to process resources missing AI summaries.
 */
async function processPendingSummaries() {
  const client = await pool.connect();
  try {
    // Find resources that:
    // 1. Are files (not external links)
    // 2. Have a storage path
    // 3. Are missing an AI summary
    const result = await client.query(`
      SELECT id, storage_path, title 
      FROM resources 
      WHERE content_type = 'file' 
      AND storage_path IS NOT NULL 
      AND (ai_summary IS NULL OR ai_summary = '')
      LIMIT 5
    `);

    if (result.rows.length === 0) return;

    console.log(`[SummaryTask] Found ${result.rows.length} resources to process.`);

    for (const resource of result.rows) {
      try {
        console.log(`[SummaryTask] Processing: ${resource.title} (${resource.id})`);

        // 1. Download file from Supabase
        const { data, error } = await supabase.storage
          .from('resources')
          .download(resource.storage_path);

        if (error) {
          console.error(`[SummaryTask] Failed to download ${resource.storage_path}:`, error.message);
          continue;
        }

        // 2. Extract & Summarize
        const buffer = Buffer.from(await data.arrayBuffer());
        const text = await extractTextFromPDF(buffer);
        const summary = await generateSummary(text);

        // 3. Update DB
        await client.query('UPDATE resources SET ai_summary = $1 WHERE id = $2', [summary, resource.id]);
        console.log(`[SummaryTask] ✅ Summary generated for: ${resource.title}`);

        // 4. Wait a bit between files to avoid hitting rate limits too hard
        await new Promise(resolve => setTimeout(resolve, 5000)); 

      } catch (err) {
        if (err.message.includes("429") || err.message.includes("high volume")) {
          console.warn(`[SummaryTask] ⚠️ Rate limit hit. Stopping this cycle to let the API cool down.`);
          break; // Stop the loop and wait for next interval
        }
        console.error(`[SummaryTask] ❌ Failed to process resource ${resource.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[SummaryTask] Critical error in summary task:', err.message);
  } finally {
    client.release();
  }
}

/**
 * Initializes and starts the background task.
 */
export function startSummaryTask(intervalMs = 60000) { // Default: Every 1 minute
  console.log(`[SummaryTask] AI Summary background task started (Interval: ${intervalMs}ms)`);
  
  // Run immediately on start
  processPendingSummaries();
  
  // Then run on interval
  setInterval(processPendingSummaries, intervalMs);
}
