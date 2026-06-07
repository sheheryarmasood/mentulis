// ══════════════════════════════════════════════════
// MENTULIS — Vercel Serverless Function
// File: /api/chat.js
// 
// This runs on Vercel's servers — your Anthropic API
// key stays secret here, never exposed to the browser.
// ══════════════════════════════════════════════════

// In-memory store for free tier tracking
// In production upgrade to Vercel KV or Upstash Redis
const userMessageCounts = new Map();
const FREE_LIMIT = 10;
const DAILY_PREMIUM_LIMIT = 100;

// System prompt for Mentulis AI
const SYSTEM_PROMPT = `You are Mentulis, a compassionate AI mental wellness companion designed especially for South Asian, Arabic, and French-speaking communities. You understand cultural nuances like family pressure, izzat (honour), immigration stress, joint family dynamics, religious coping, and mental health stigma in these communities.

Core rules:
- Never claim to be a therapist or provide medical diagnoses
- Use warm, calm, culturally-aware language  
- Keep responses concise: 2-4 sentences plus one gentle follow-up question
- If the user mentions suicide, self-harm, or crisis: respond with empathy IMMEDIATELY then provide crisis lines: Canada 988, Pakistan Umang 0317-4288665, India iCall 9152987821
- Respond in the same language the user writes in (English, Urdu, Hindi, Punjabi, Arabic, or French)
- Reference CBT or DBT techniques gently when relevant — never lecture
- Never suggest physical discomfort as coping (no ice cubes, cold water, etc.)
- Honor the user's feelings before suggesting techniques`;

const CRISIS_WORDS = [
  'suicid', 'kill myself', 'end my life', 'cant go on',
  'no reason to live', 'want to die', 'self harm',
  'hurt myself', 'end it all', 'not worth living', 'better off dead'
];

function isCrisis(text) {
  const l = text.toLowerCase();
  return CRISIS_WORDS.some(w => l.includes(w));
}

function getCrisisResponse() {
  return `I hear you, and I'm genuinely concerned about you right now. 💙 Please know you are not alone.

🇨🇦 Canada: Call or text **988** (free, 24/7)
🇵🇰 Pakistan Umang: **0317-4288665** (free, confidential)
🇮🇳 India iCall: **9152987821** (Mon–Sat, 8am–10pm)
🌍 International: **findahelpline.com**

I'm still here with you. Can you tell me a little more about what's happening?`;
}

function getUserKey(email, sessionId) {
  // Use email if available, otherwise session ID
  return email || sessionId || 'anonymous';
}

function getTodayKey(userKey) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${userKey}:${today}`;
}

export default async function handler(req, res) {
  // ── CORS headers — allow your domain only ──
  const allowedOrigins = [
    'https://mentulis.com',
    'https://www.mentulis.com',
    'http://localhost:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
  ];

  const origin = req.headers.origin;
  const isAllowedOrigin = allowedOrigins.includes(origin) ||
    (origin && /^https:\/\/mentulis[\w-]*\.vercel\.app$/.test(origin));
  if (isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      messages,       // conversation history array
      userEmail,      // user's email (from Google auth or signup)
      sessionId,      // fallback session identifier
      isPremium,      // premium flag from frontend
      mood,           // current mood (1-5)
      language        // selected language code
    } = req.body;

    // ── Validate input ──
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const userKey = getUserKey(userEmail, sessionId);
    const todayKey = getTodayKey(userKey);

    // ── FREE TIER ENFORCEMENT ──
    // Get this user's total message count
    const totalCount = userMessageCounts.get(userKey) || 0;
    const todayCount = userMessageCounts.get(todayKey) || 0;

    if (!isPremium && totalCount >= FREE_LIMIT) {
      return res.status(402).json({
        error: 'free_limit_reached',
        message: 'You have used all 10 free chats. Upgrade to Premium for unlimited conversations.',
        chatsUsed: totalCount,
        freeLimit: FREE_LIMIT
      });
    }

    // ── DAILY RATE LIMIT (premium abuse protection) ──
    const dailyLimit = isPremium ? DAILY_PREMIUM_LIMIT : FREE_LIMIT;
    if (todayCount >= dailyLimit) {
      return res.status(429).json({
        error: 'daily_limit_reached',
        message: isPremium 
          ? 'Daily message limit reached. Resets at midnight. This protects against abuse.'
          : 'Daily limit reached.',
        resetAt: 'midnight UTC'
      });
    }

    // ── CRISIS CHECK — handle before API call ──
    const lastMessage = messages[messages.length - 1]?.content || '';
    if (isCrisis(lastMessage)) {
      // Still count this as a message
      userMessageCounts.set(userKey, totalCount + 1);
      userMessageCounts.set(todayKey, todayCount + 1);
      
      return res.status(200).json({
        reply: getCrisisResponse(),
        chatsUsed: totalCount + 1,
        isCrisisResponse: true
      });
    }

    // ── BUILD system prompt with context ──
    const moodLabels = ['', 'very low', 'low', 'okay', 'good', 'great'];
    const moodContext = mood ? `The user's current mood is: ${moodLabels[mood] || 'unknown'} (${mood}/5). Adapt your tone accordingly.` : '';
    const langContext = language && language !== 'en' ? `The user has selected ${language} as their language. Respond in that language when they write in it.` : '';
    
    const fullSystem = [SYSTEM_PROMPT, moodContext, langContext].filter(Boolean).join('\n\n');

    // ── CALL ANTHROPIC API ──
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: fullSystem,
        messages: messages.slice(-20) // last 20 messages max to control cost
      })
    });

    if (!anthropicRes.ok) {
      const errData = await anthropicRes.json().catch(() => ({}));
      console.error('Anthropic API error:', errData);
      return res.status(500).json({
        error: 'ai_error',
        message: 'AI service temporarily unavailable. Please try again in a moment.'
      });
    }

    const data = await anthropicRes.json();
    const reply = data.content?.[0]?.text || "I'm here with you. Could you tell me a little more about how you're feeling?";

    // ── INCREMENT message counts ──
    userMessageCounts.set(userKey, totalCount + 1);
    userMessageCounts.set(todayKey, todayCount + 1);

    // ── RETURN response ──
    return res.status(200).json({
      reply,
      chatsUsed: totalCount + 1,
      chatsRemaining: isPremium ? 'unlimited' : Math.max(0, FREE_LIMIT - (totalCount + 1)),
      isPremium: !!isPremium
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'server_error',
      message: 'Something went wrong. Please try again.'
    });
  }
}
