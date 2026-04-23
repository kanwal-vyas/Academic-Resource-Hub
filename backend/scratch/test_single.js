import { GoogleGenerativeAI } from "@google/generative-ai";

async function testSingle() {
  const key = "AIzaSyDLNpzi3L88-aHf-FJ1kzUev4MXD5P2OAI"; // The last key in your .env
  console.log(`Testing last key: ${key}`);
  const genAI = new GoogleGenerativeAI(key);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("hi");
    console.log("✅ SUCCESS!");
    console.log("Response:", result.response.text());
  } catch (e) {
    console.log("❌ FAILED:", e.message);
  }
}

testSingle();
