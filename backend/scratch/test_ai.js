import { chatWithAI } from '../utils/ai.js';

async function test() {
  try {
    console.log('Testing AI connection...');
    const response = await chatWithAI([], 'Hello, are you working?');
    console.log('AI Response:', response);
    process.exit(0);
  } catch (err) {
    console.error('AI Error Detailed:', err);
    process.exit(1);
  }
}

test();
