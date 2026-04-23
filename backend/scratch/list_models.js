import { GoogleGenerativeAI } from "@google/generative-ai";
import config from '../config.js';

async function listModels() {
  try {
    const genAI = new GoogleGenerativeAI(config.gemini.primaryKey);
    // There is no direct listModels in the SDK easily accessible without an authenticated client
    // But we can try a few common names
    const models = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro"
    ];
    
    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("hi");
            console.log(`✅ Model ${m} is working!`);
            process.exit(0);
        } catch (e) {
            console.log(`❌ Model ${m} failed: ${e.message}`);
        }
    }
    process.exit(1);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listModels();
