import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

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

// Middleware
app.use(express.json());
app.use(cors());

// Path config for static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Chat route
app.post('/chat', async (req, res) => {
  try {
    const { message, userId = "anonymous" } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // New conversation check
    const isNewConversation = !userConversations.has(userId);
    if (isNewConversation) {
      userConversations.set(userId, true);
    }

    // Prompt format
    const prompt = `
You are Medinova, a compassionate and knowledgeable AI Doctor.

${isNewConversation
        ? 'This is a new conversation. Greet the user warmly and express your readiness to assist with medical advice.'
        : 'This is an ongoing conversation. Provide specific and actionable suggestions based on the current symptoms.'}

User: ${message}
`;

    // Send request to Gemini API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔴 Gemini API Error:", errorText);
      throw new Error(`Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ Gemini API response:", JSON.stringify(data, null, 2));

    const botReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I didn't quite understand that.";

    res.json({ reply: botReply });

  } catch (error) {
    console.error('❌ Request Error:', error.message);
    console.error('🔍 Full Stack Trace:', error);
    res.status(500).json({ reply: "Sorry, something went wrong!" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
