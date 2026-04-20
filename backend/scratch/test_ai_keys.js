import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config();

const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
const apiKeys = rawKeys.split(',').map(key => key.trim()).filter(key => key.length > 0);

console.log(`Found ${apiKeys.length} keys.`);

async function testKeys() {
  for (let i = 0; i < apiKeys.length; i++) {
    const key = apiKeys[i];
    console.log(`Testing Key #${i+1}: ${key.substring(0, 10)}...`);
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    try {
      const result = await model.generateContent("Hi");
      const response = await result.response;
      console.log(`Key #${i+1} SUCCESS: ${response.text().substring(0, 20)}...`);
    } catch (error) {
      console.error(`Key #${i+1} FAILED:`, error.message);
    }
  }
}

testKeys();
