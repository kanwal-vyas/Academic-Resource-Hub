import { GoogleGenerativeAI } from "@google/generative-ai";

async function testFlash15() {
  const key = "AIzaSyDLNpzi3L88-aHf-FJ1kzUev4MXD5P2OAI";
  console.log(`Testing with gemini-1.5-flash: ${key}`);
  const genAI = new GoogleGenerativeAI(key);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("hi");
    console.log("✅ SUCCESS!");
    console.log("Response:", result.response.text());
  } catch (e) {
    console.log("❌ FAILED:", e.message);
  }
}

testFlash15();
