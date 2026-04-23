import { GoogleGenerativeAI } from "@google/generative-ai";
import config from '../config.js';

async function test() {
  const genAI = new GoogleGenerativeAI(config.gemini.primaryKey);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("hi");
    console.log("Success with gemini-pro!");
  } catch (e) {
    console.log("Failed with gemini-pro:", e.message);
  }
}

test();
