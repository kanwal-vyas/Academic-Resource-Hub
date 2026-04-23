import { GoogleGenerativeAI } from "@google/generative-ai";
import config from '../config.js';

async function testAllKeys() {
  const allKeys = config.gemini.allKeys;
  console.log(`Testing ${allKeys.length} keys with gemini-2.0-flash...`);
  
  for (let i = 0; i < allKeys.length; i++) {
    const key = allKeys[i];
    console.log(`\n--- Key #${i+1}: ${key.substring(0, 10)}... ---`);
    const genAI = new GoogleGenerativeAI(key);
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("hi");
        console.log(`✅ SUCCESS! Key #${i+1} is working.`);
    } catch (e) {
        console.log(`❌ FAILED: ${e.message}`);
        if (e.status === 429) console.log('   Reason: Rate Limit / Quota Exceeded');
        if (e.status === 400) console.log('   Reason: Invalid Argument / Key?');
        if (e.status === 403) console.log('   Reason: Permission Denied');
        if (e.status === 404) console.log('   Reason: Model Not Found');
    }
  }
}

testAllKeys();
