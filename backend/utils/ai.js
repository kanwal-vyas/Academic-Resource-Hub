import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import config from '../config.js';

// --- Client Initializations ---
const apiKeys = config.gemini.allKeys;
const geminiClients = apiKeys.map(key => new GoogleGenerativeAI(key));

// Groq is OpenAI-compatible
const groqClient = config.groq.apiKey ? new OpenAI({
  apiKey: config.groq.apiKey,
  baseURL: config.groq.baseUrl
}) : null;

/**
 * Helper to determine which provider to use.
 * Prioritizes Groq if a key is provided.
 */
async function executeAIOperation(operationFn) {
  if (groqClient) {
    try {
      return await operationFn(groqClient, 'groq');
    } catch (error) {
      console.error("Groq Error:", error.message);
      if (geminiClients.length === 0) throw error;
      console.warn("Groq failed. Falling back to Gemini...");
    }
  }

  // Gemini Fallback Logic
  if (geminiClients.length === 0) {
    throw new Error("No AI providers configured (Missing Groq or Gemini keys)");
  }

  let lastError = null;
  for (let i = 0; i < geminiClients.length; i++) {
    try {
      return await operationFn(geminiClients[i], 'gemini', i);
    } catch (error) {
      lastError = error;
      const errorMsg = error.message?.toLowerCase() || "";
      const isQuotaError = error.status === 429 || errorMsg.includes("429") || errorMsg.includes("quota");

      if (isQuotaError && i < apiKeys.length - 1) {
        console.warn(`Gemini Key #${i+1} hit quota. Rotating...`);
        continue;
      }
      
      if (isQuotaError) {
        const quotaError = new Error("The AI Assistant is currently very busy. Please try again in a few moments!");
        quotaError.isQuotaExceeded = true;
        throw quotaError;
      }
      break; 
    }
  }
  throw lastError;
}

// --- Text Extraction ---
import { createCanvas, loadImage } from 'canvas';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import Tesseract from 'tesseract.js';

export async function extractTextFromPDF(buffer) {
  try {
    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data: uint8Array, useSystemFonts: true, disableFontFace: true });
    const doc = await loadingTask.promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(" ") + "\n";
    }
    if (text.trim().length < 50) text = await performOCR(buffer);
    return text;
  } catch (error) {
    throw new Error("Failed to extract text from PDF");
  }
}

async function performOCR(buffer) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true }).promise;
  const numPages = Math.min(doc.numPages, 10);
  let ocrText = "";
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = createCanvas(viewport.width, viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const { data: { text } } = await Tesseract.recognize(canvas.toBuffer('image/png'), 'eng');
    ocrText += `--- Page ${i} ---\n${text}\n\n`;
  }
  return ocrText;
}

// --- AI Features ---

export async function generateSummary(text) {
  return executeAIOperation(async (client, provider) => {
    const prompt = `Summarize this academic text into a concise "Quick Snapshot" (max 200 words):\n\n${text.substring(0, 30000)}`;
    
    if (provider === 'groq') {
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
      });
      return completion.choices[0].message.content;
    } else {
      const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(prompt);
      return result.response.text();
    }
  });
}

export async function chatWithAI(history, userMessage, context = null, globalContext = null) {
  return executeAIOperation(async (client, provider) => {
    const systemInstruction = `
      You are the "Academic Assistant" for the Academic Resource Hub. Be professional and concise (2-3 sentences max).
      Platform Info: Rashtriya Raksha University (RRU) SITAICS material sharing. Find Unit Notes, Question Papers, Assignments here.
      Navigation tags: [NAVIGATE:/browse|Browse], [NAVIGATE:/faculty|Faculty], [NAVIGATE:/upload|Upload].
      ${context ? `Current Context: ${context.title} (${context.subject_name})` : ''}
    `;

    if (provider === 'groq') {
      const messages = [
        { role: "system", content: systemInstruction },
        ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.message })),
        { role: "user", content: userMessage }
      ];
      const completion = await client.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages,
        max_tokens: 150
      });
      return completion.choices[0].message.content;
    } else {
      const model = client.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction
      });
      const chat = model.startChat({
        history: history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.message }]
        })),
      });
      const result = await chat.sendMessage(userMessage);
      return result.response.text();
    }
  });
}
