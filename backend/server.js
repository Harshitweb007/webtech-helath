import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config(); // Load API key from .env

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY;

// Exit if API key is missing
if (!API_KEY) {
  console.error("❌ ERROR: Missing Gemini API key. Please check your .env file or Render config.");
  process.exit(1);
}

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// Track conversation state for each user
const userConversations = new Map();

// Enable JSON and CORS
app.use(express.json());
app.use(cors());

// Path handling for serving static frontend files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Route: Health check
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route: Chat handler
app.post('/chat', async (req, res) => {
  try {
    const { message, userId = "anonymous" } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Check if it's a new conversation
    const isNewConversation = !userConversations.has(userId);
    if (isNewConversation) {
      userConversations.set(userId, true);
    }

    // Gemini Prompt
    const prompt = `
You are Medinova, a compassionate and knowledgeable AI Doctor...

${isNewConversation
      ? 'This is a new conversation. Greet the user warmly and express your readiness to assist with medical advice.'
      : 'This is an ongoing conversation. Provide specific and actionable suggestions based on the current symptoms.'}

User: ${message}
`;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure.";

    res.json({ reply: botReply });
  } catch (error) {
    console.error('❌ Request Error:', error.message);
    console.error('🔍 Full Error:', error); // Helps in Render logs
    res.status(500).json({ reply: "Sorry, something went wrong!" });
  }
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
