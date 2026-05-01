/**
 * AI service for Fit-Forward — powered by Groq (using native fetch for React Native compatibility).
 * Maintains the same exported API as the previous Gemini service so the
 * rest of the app requires zero changes.
 *
 * Functions:
 *  - buildCoachSystemPrompt
 *  - sendCoachMessage
 *  - analyzeFoodPhoto
 *  - generateMealPlan
 *  - generateWeeklyAnalysis
 */

// ─── Client ───────────────────────────────────────────────────────────────────
const apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';

if (!apiKey) {
  console.warn('[Groq] Missing EXPO_PUBLIC_GROQ_API_KEY in .env. Please restart your Metro Bundler.');
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// ─── Model IDs ────────────────────────────────────────────────────────────────
const CHAT_MODEL   = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'; // Groq's official vision model

// Helper to make fetch calls to Groq API
async function fetchGroq(payload: any) {
  if (!apiKey) {
    throw new Error('Groq API Key is missing. Make sure EXPO_PUBLIC_GROQ_API_KEY is in your .env file and restart the app.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data;
}

// ─── Coach system prompt ──────────────────────────────────────────────────────
export function buildCoachSystemPrompt(userProfile: {
  name: string;
  goal: string;
  tdee: number;
  targetCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  restrictions?: string[];
}) {
  return `You are Fitz, an expert AI nutrition coach inside the Fit-Forward app.

User profile:
- Name: ${userProfile.name}
- Goal: ${userProfile.goal}
- TDEE: ${userProfile.tdee} kcal/day
- Daily target: ${userProfile.targetCalories} kcal
- Macro targets: ${userProfile.macros.protein}g protein, ${userProfile.macros.carbs}g carbs, ${userProfile.macros.fat}g fat
${userProfile.restrictions?.length ? `- Dietary restrictions: ${userProfile.restrictions.join(', ')}` : ''}

Guidelines:
1. Be encouraging, concise, and science-backed.
2. Always tailor advice to the user's goal and profile.
3. When suggesting foods, include rough macros.
4. Keep responses under 200 words unless the user asks for a detailed plan.
5. Use emojis sparingly to keep the tone friendly.
6. If the user asks something outside nutrition/fitness, gently redirect.`;
}

// ─── Send coach message ───────────────────────────────────────────────────────
export async function sendCoachMessage(
  history: { role: 'user' | 'model'; parts: any[] }[],
  userMessage: string,
  systemPrompt: string,
  base64Image?: string
): Promise<string> {
  // Convert Gemini-style history → OpenAI-style messages
  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...history.map((turn) => ({
      role: turn.role === 'model' ? 'assistant' : 'user',
      content: turn.parts.map((p: any) => p.text ?? '').join(''),
    })),
  ];

  // Current user message — with optional image
  if (base64Image) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: userMessage || 'Analyze this image.' },
        {
          type: 'image_url',
          image_url: { url: `data:image/jpeg;base64,${base64Image}` },
        },
      ],
    });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  const data = await fetchGroq({
    model: base64Image ? VISION_MODEL : CHAT_MODEL,
    messages,
    max_tokens: 600,
    temperature: 0.7,
  });

  return data.choices[0]?.message?.content ?? '';
}

// ─── Food photo analysis ───────────────────────────────────────────────────────
export async function analyzeFoodPhoto(base64Image: string): Promise<{
  foods: { name: string; grams: number; calories: number; protein: number; carbs: number; fat: number }[];
  totalCalories: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
}> {
  if (!base64Image) {
    throw new Error('Image data is missing or empty.');
  }

  const prompt = `Analyze this food image and estimate the nutritional content.
IMPORTANT: Return ONLY a valid JSON object. Do not include markdown blocks or extra text.
Structure:
{
  "foods": [
    { "name": "food name", "grams": 150, "calories": 250, "protein": 20, "carbs": 30, "fat": 8 }
  ],
  "totalCalories": 250,
  "confidence": "high",
  "notes": "brief note about the estimation"
}`;

  try {
    const data = await fetchGroq({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image.replace(/\n|\r/g, '')}` },
            },
          ],
        },
      ],
      max_tokens: 1024,
      temperature: 0.4,
    });

    let text = (data.choices[0]?.message?.content ?? '').trim();
    
    // Robust JSON extraction (find first { and last })
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1) {
      text = text.slice(startIndex, endIndex + 1);
    }
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error('[Groq] Analyze food photo error:', error);
    throw new Error(error.message || 'Failed to parse AI response. Please try again.');
  }
}

// ─── Generate weekly meal plan ─────────────────────────────────────────────────
export async function generateMealPlan(userProfile: {
  targetCalories: number;
  macros: { protein: number; carbs: number; fat: number };
  goal: string;
  restrictions?: string[];
  preferences?: string[];
}): Promise<Record<string, { meal: string; name: string; calories: number; protein: number; carbs: number; fat: number }[]>> {
  const prompt = `Create a 7-day meal plan for someone with these parameters:
- Daily calories: ${userProfile.targetCalories} kcal
- Macros: ${userProfile.macros.protein}g protein, ${userProfile.macros.carbs}g carbs, ${userProfile.macros.fat}g fat
- Goal: ${userProfile.goal}
${userProfile.restrictions?.length ? `- Restrictions: ${userProfile.restrictions.join(', ')}` : ''}
${userProfile.preferences?.length ? `- Preferences: ${userProfile.preferences.join(', ')}` : ''}

Return ONLY valid JSON (no markdown). Use this exact structure:
{
  "Mon": [
    { "meal": "breakfast", "name": "Oatmeal with berries", "calories": 350, "protein": 12, "carbs": 60, "fat": 8 },
    { "meal": "lunch", "name": "Grilled chicken salad", "calories": 450, "protein": 40, "carbs": 20, "fat": 15 },
    { "meal": "dinner", "name": "Salmon with vegetables", "calories": 500, "protein": 45, "carbs": 25, "fat": 20 },
    { "meal": "snack", "name": "Greek yogurt", "calories": 150, "protein": 15, "carbs": 12, "fat": 3 }
  ],
  "Tue": [],
  "Wed": [],
  "Thu": [],
  "Fri": [],
  "Sat": [],
  "Sun": []
}`;

  const data = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4096,
    temperature: 0.6,
    response_format: { type: 'json_object' },
  });

  let text = (data.choices[0]?.message?.content ?? '').trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Failed to parse meal plan from AI. Please try again.');
  }
}

// ─── Weekly analysis ───────────────────────────────────────────────────────────
export async function generateWeeklyAnalysis(data: {
  avgCalories: number;
  targetCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  goal: string;
  daysLogged: number;
}): Promise<string> {
  const prompt = `Provide a concise weekly nutrition analysis (max 150 words) for this user:
- Goal: ${data.goal}
- Days logged: ${data.daysLogged}/7
- Average calories: ${data.avgCalories} kcal (target: ${data.targetCalories})
- Average macros: ${data.avgProtein}g protein, ${data.avgCarbs}g carbs, ${data.avgFat}g fat
Give 2-3 specific, actionable tips for next week. Be encouraging.`;

  const responseData = await fetchGroq({
    model: CHAT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.7,
  });

  return responseData.choices[0]?.message?.content ?? '';
}
