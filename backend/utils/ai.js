import { GoogleGenerativeAI } from "@google/generative-ai";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Extracts text from a PDF buffer.
 * @param {Buffer} buffer 
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * @param {string} text 
 * @returns {Promise<string>}
 */
export async function generateSummary(text) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }

  try {
    const prompt = `
      You are an expert academic assistant. Summarize the following academic resource text into a concise "Quick Snapshot".
      Provide the summary in a clean, structured format (using bullet points where appropriate).
      Focus on the key concepts, main objectives, and important takeaways.
      Keep the tone professional and helpful for a student.
      Maximum length: 200 words.
      
      Text to summarize:
      ${text.substring(0, 30000)} // Limiting text to stay within safe token limits for simple summaries
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating summary with Gemini:", error);
    throw new Error("Failed to generate AI summary");
  }
}
