import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
<<<<<<< HEAD
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
=======

>>>>>>> 8abe8df033c262abf590f1105545f0e8944f0ffc

dotenv.config();


// --- API Key Management & Client Initialization ---
const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
const apiKeys = rawKeys.split(',').map(key => key.trim()).filter(key => key.length > 0);

if (apiKeys.length === 0) {
  console.warn("WARNING: No Gemini API keys found in environment variables.");
}

// Map each key to its own GoogleGenerativeAI instance
const clients = apiKeys.map(key => new GoogleGenerativeAI(key));

/**
 * Executes an AI operation with automatic retry/rotation on 429 errors.
 * @param {Function} operationFn - A function that takes a (client, index) and returns a promise
 * @returns {Promise<any>}
 */
async function executeAIOperation(operationFn) {
  if (clients.length === 0) {
    throw new Error("Gemini API is not configured. (Missing keys)");
  }

  let lastError = null;

  // Try each client sequentially if we hit a rate limit
  for (let i = 0; i < clients.length; i++) {
    try {
      const result = await operationFn(clients[i], i);
      return result;
    } catch (error) {
      lastError = error;
      
      // Specifically check for "Too Many Requests" (429) or quota errors
      const isQuotaError = error.status === 429 || 
                          error.message?.includes("429") || 
                          error.message?.includes("quota") || 
                          error.message?.toLowerCase().includes("exhausted");

      if (isQuotaError && i < clients.length - 1) {
        console.warn(`Gemini API Key #${i+1} hit quota limit. Rotating to next key...`);
        continue; // Try next key
      }
      
      // If it's not a quota error, or we're on the last key, rethrow
      break; 
    }
  }

  throw lastError;
}

// --- Imports ---

import { createCanvas, loadImage } from 'canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import Tesseract from 'tesseract.js';

/**
 * Extracts text from a PDF buffer.
 * Falls back to OCR if digital text is not found.
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(buffer) {
  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true
    });
    const doc = await loadingTask.promise;
    let text = "";
    
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      text += strings.join(" ") + "\n";
    }

    
    // Fallback to OCR if digital text is empty or nearly empty
    if (text.trim().length < 50) {
      console.log('No digital text found. Triggering OCR fallback...');
      text = await performOCR(buffer);
    }
    
    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Performs OCR on a PDF by converting pages to images first.
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
async function performOCR(buffer) {
  const OCR_PAGE_LIMIT = 10;
  let ocrText = "";

  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      disableFontFace: true
    });
    
    const doc = await loadingTask.promise;
    const numPages = Math.min(doc.numPages, OCR_PAGE_LIMIT);
    
    console.log(`Starting OCR for ${numPages} pages...`);

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const imageBuffer = canvas.toBuffer('image/png');
      const { data: { text } } = await Tesseract.recognize(imageBuffer, 'eng');
      ocrText += `--- Page ${i} ---\n${text}\n\n`;
      console.log(`OCR complete for page ${i}/${numPages}`);
    }

    return ocrText;
  } catch (err) {
    console.error('OCR Process failed:', err);
    throw new Error('Failed to extract text via OCR fallback');
  }
}

/**
 * @param {string} text 
 * @returns {Promise<string>}
 */
export async function generateSummary(text) {
  return executeAIOperation(async (client, index) => {
    try {
      const prompt = `
        You are an expert academic assistant. Summarize the following academic resource text into a concise "Quick Snapshot".
        Provide the summary in a clean, structured format.
        - Use '###' for section titles.
        - Use '**' for bold labels or key terms.
        - Use '*' or '-' for bullet points.
        
        The summary must focus on key concepts, main objectives, and important takeaways.
        Keep the tone professional and helpful for a student.
        Maximum length: 200 words.
        
        Text to summarize:
        ${text.substring(0, 30000)}
      `;

      const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Error generating summary with Gemini Key #${index + 1}:`, error);
      throw error; // Re-throw so executeAIOperation can handle rotation
    }
  }).catch(error => {
    throw new Error(`AI Summarizer Error: ${error.message}`);
  });
}

/**
 * @param {Array<{role: string, message: string}>} history 
 * @param {string} userMessage 
 * @param {Object} context 
 * @param {Object} globalContext
 * @returns {Promise<string>}
 */
export async function chatWithAI(history, userMessage, context = null, globalContext = null) {
  return executeAIOperation(async (client, index) => {
    try {
      let globalInfo = "";
      if (globalContext) {
        globalInfo = `
          ACADEMIC HUB OVERVIEW:
          - Total Resources currently available: ${globalContext.totalResources || 0}
        `;
      }

      const model = client.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: `
          You are the "Academic Assistant" for the Academic Resource Hub. 
          Your goal is to provide EXTREMELY BRIEF, direct, and helpful answers.
          
          PROJECT OVERVIEW:
          - This is a centralized platform for RRU SITAICS students and faculty to share academic materials.
          - Users can find Unit Notes, Question Papers, Assignments, and Reading Materials here.
          - Faculty can upload resources; Students can browse and download them once verified by Admin.

          NAVIGATION MAP (Use specific tags ONLY):
          - Browse/Find Notes/Search: [NAVIGATE:/browse|Browse Resources]
          - Faculty/Teachers/Staff: [NAVIGATE:/faculty|Faculty Directory]
          - Upload/Contribution: [NAVIGATE:/upload|Upload Resource]
          - My Profile/My Uploads: [NAVIGATE:/my-resources|My Resources]
          - Dashboard/Latest: [NAVIGATE:/|Dashboard]
          - Help/Admin Contact: [NAVIGATE:/contact|Contact Admin]

          ${globalInfo}
          
          ${context ? `
          CURRENT RESOURCE FOCUS (Answer based on this):
          - Title: ${context.title}
          - Type: ${context.resource_type}
          - Subject: ${context.subject_name}
          - Description: ${context.description}
          ` : 'General Context: Help the user find resources or navigate efficiently.'}

          CORE BEHAVIOR:
          1. Be professional but very concise (2-3 sentences max).
          2. Give direct answers.
          3. Use [NAVIGATE:path|Label] only when recommending a specific next step. 
          4. When asked "What is this project?" or similar, describe the "Academic Resource Hub" as the official RRU SITAICS material sharing platform.
        `
      });

      const chat = model.startChat({
        history: history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.message }]
        })),
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Error in AI chat session with Key #${index + 1}:`, error);
      throw error;
    }
  }).catch(error => {
    throw new Error(`AI Assistant Error: ${error.message}`);
  });
}
