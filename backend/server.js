import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// App setup
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY =AIzaSyCdJlFnHTfGsNcxI0wJInpqFmsHrh2_CoU;

// Exit if API key is missing
if (!API_KEY) {
  console.error("❌ ERROR: Missing Gemini API key. Please check your .env file or Render environment.");
  process.exit(1);
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Track conversations
const userConversations = new Map();

// Middleware
app.use(express.json());
app.use(cors());

// Static path handling
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Chat route
app.post('/chat', async (req, res) => {
  try {
    const { message, userId = 'anonymous' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const isNewConversation = !userConversations.has(userId);
    if (isNewConversation) userConversations.set(userId, true);

    // Gemini Prompt
    const prompt = `
You are Medinova, a compassionate and knowledgeable AI Doctor.

${isNewConversation
      ? 'This is a new conversation. Greet the user warmly and express your readiness to assist with medical advice.'
      : 'This is an ongoing conversation. Provide specific and actionable suggestions based on the current symptoms.'}

User: ${message}
`;

    // Gemini API call
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Gemini API Error:", errorText);
      throw new Error(`Gemini returned HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Gemini API Response:", JSON.stringify(data, null, 2));

    const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that.";

    res.json({ reply: botReply });

  } catch (error) {
    console.error('❌ Chat Request Failed:', error.message);
    console.error('🔍 Stack Trace:', error);
    res.status(500).json({ reply: "Sorry, something went wrong!" });
  }
});

// Server start (bind to PORT only — DO NOT use 'localhost')
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
