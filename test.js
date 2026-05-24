const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

// Read .env
const env = fs.readFileSync('.env', 'utf8');
const key = env.split('\n').find(l => l.startsWith('GEMINI_API_KEY=')).split('=')[1].trim();

const genAI = new GoogleGenerativeAI(key);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    await model.generateContent('hello');
    console.log('1.5-flash works!');
  } catch(e) { console.log('1.5-flash failed:', e.message); }
  
  try {
    const model2 = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    await model2.generateContent('hello');
    console.log('1.5-pro works!');
  } catch(e) { console.log('1.5-pro failed:', e.message); }

  try {
    const model3 = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    await model3.generateContent('hello');
    console.log('2.5-pro works!');
  } catch(e) { console.log('2.5-pro failed:', e.message); }
  
  try {
    const model4 = genAI.getGenerativeModel({ model: 'gemini-pro' });
    await model4.generateContent('hello');
    console.log('gemini-pro works!');
  } catch(e) { console.log('gemini-pro failed:', e.message); }
}
test();
