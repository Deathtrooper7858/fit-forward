/**
 * Gemini AI service for Fit-Forward.
 * - Coach chat (gemini-2.0-flash)
 * - Food photo analysis (gemini-2.0-flash with vision — gemini-1.5-pro is deprecated)
 * - Plan generation
 */
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

if (!apiKey) {
  console.warn('[Gemini] Missing EXPO_PUBLIC_GEMINI_API_KEY in .env');
}

const genAI = new GoogleGenerativeAI(apiKey);

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// ─── Models ───────────────────────────────────────────────────────────────────
// gemini-2.0-flash: stable, supports vision + system_instruction via v1beta SDK
export const flashModel = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  safetySettings,
});

// Use flash for everything — 1.5-pro is deprecated on v1beta
export const proModel = flashModel;

// ─── Coach system prompt ───────────────────────────────────────────────────────
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
  // SDK v0.24: systemInstruction must be set on the model, not in startChat()
  // Pass it as a Content object (parts array), NOT a raw string
  const modelWithSystem = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    safetySettings,
    systemInstruction: {
      role: 'user',
      parts: [{ text: systemPrompt }],
    },
  });

  const chat = modelWithSystem.startChat({
    history,
    generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
  });

  const msgParts: any[] = [{ text: userMessage || 'Analyze this image.' }];
  if (base64Image) {
    msgParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Image } });
  }

  const result = await chat.sendMessage(msgParts);
  return result.response.text();
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
    const result = await flashModel.generateContent({
      contents: [{ role: 'user', parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: prompt }
      ]}],
      generationConfig: {
        temperature: 0.4,
        topP: 1,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    });

    let text = result.response.text().trim();
    // Strip any accidental markdown fences
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error('[Gemini] JSON Parse Error. Raw text:', text);
      throw new Error('Failed to parse AI response. Please try again.');
    }
  } catch (error: any) {
    console.error('[Gemini] Analyze food photo error:', error);
    if (error.message?.includes('SAFETY')) {
      throw new Error('Image blocked by safety filters. Please take a clearer photo of the food.');
    }
    throw error;
  }
}

// ─── Generate weekly meal plan (returns structured JSON) ──────────────────────
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
  "Tue": [...],
  "Wed": [...],
  "Thu": [...],
  "Fri": [...],
  "Sat": [...],
  "Sun": [...]
}`;

  const result = await flashModel.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
    },
  });

  let text = result.response.text().trim();
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

  const result = await flashModel.generateContent(prompt);
  return result.response.text();
}
