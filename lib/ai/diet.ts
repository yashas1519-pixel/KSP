/**
 * Google Gemini API integration for AI-powered diet plan generation.
 * SERVER-SIDE ONLY — called from API routes.
 */

import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { DietPlanInput, DietPlanOutput } from "@/types/diet";
import { BMI_CATEGORY_LABELS } from "@/constants/bmi";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are a certified nutritionist and fitness expert specialising in 
diet plans for Indian police personnel in Karnataka, India.

You must respond with ONLY a valid JSON object. No explanation, no markdown, no code blocks. Raw JSON only starting with { and ending with }.

Rules:
- Use locally available Karnataka foods (ragi, jowar, rice, sambar, 
  rasam, idli, dosa, chapati, dal, seasonal vegetables)
- Vegetarian plans must contain zero meat, fish, or eggs
- Non-vegetarian plans may include chicken, fish, eggs, and all veg items
- Adjust calories based on duty type: field duty = higher calories, 
  administrative = moderate calories
- For existing conditions: diabetes → low glycemic foods, 
  hypertension → low sodium, heart condition → low fat
- All food names must appear in both English and Kannada
- Portion sizes in standard Indian measurements (katori, cup, piece)

Respond with this exact JSON structure:
{
  "weeklyPlan": [
    {
      "day": "Monday",
      "dayKn": "ಸೋಮವಾರ",
      "breakfast": {
        "items": [{"nameEn": "", "nameKn": "", "portion": "", "calories": 0}],
        "totalCalories": 0
      },
      "lunch": {
        "items": [{"nameEn": "", "nameKn": "", "portion": "", "calories": 0}],
        "totalCalories": 0
      },
      "dinner": {
        "items": [{"nameEn": "", "nameKn": "", "portion": "", "calories": 0}],
        "totalCalories": 0
      },
      "dailyTotalCalories": 0
    }
  ],
  "dailyWaterLitres": 0,
  "weeklyCalorieTarget": 0,
  "nutritionNotes": {
    "en": "",
    "kn": ""
  }
}`;

function buildDietPrompt(input: DietPlanInput): string {
  const category = BMI_CATEGORY_LABELS[input.bmiCategory];
  const diet = input.dietPreference === "veg" ? "Vegetarian" : "Non-Vegetarian";
  const conditions = input.existingConditions.length > 0
    ? input.existingConditions.join(", ")
    : "None";

  return `Generate a 7-day personalised diet plan for a Karnataka Police staff member:
- BMI Category: ${category}
- Diet Preference: ${diet}
- Age: ${input.ageYears} years
- Gender: ${input.gender}
- Duty Type: ${input.dutyType}
- Existing Conditions: ${conditions}
- Language: Food names in both English and Kannada

Provide a complete weekly plan (Monday through Sunday).`;
}

function validateDietPlan(data: unknown): data is DietPlanOutput {
  if (typeof data !== "object" || data === null) return false;
  const plan = data as Record<string, unknown>;

  if (!Array.isArray(plan.weeklyPlan) || plan.weeklyPlan.length === 0) return false;
  if (typeof plan.dailyWaterLitres !== "number") return false;
  if (typeof plan.weeklyCalorieTarget !== "number") return false;
  if (typeof plan.nutritionNotes !== "object" || plan.nutritionNotes === null) return false;

  // Validate at least the first day has the right structure
  const day = plan.weeklyPlan[0] as Record<string, unknown>;
  if (!day.day || !day.breakfast || !day.lunch || !day.dinner) return false;

  return true;
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("rate_limit") || msg.includes("429") || msg.includes("quota");
  }
  return false;
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateDietPlan(
  input: DietPlanInput
): Promise<DietPlanOutput> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const userPrompt = buildDietPrompt(input);
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

  async function callGemini(): Promise<DietPlanOutput> {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();

    if (!text) {
      throw new Error("No text content in Gemini response");
    }

    const parsed = JSON.parse(text);

    if (!validateDietPlan(parsed)) {
      throw new Error("Gemini returned invalid diet plan structure");
    }

    return parsed;
  }

  // Try once; if invalid JSON, retry once
  // If rate-limited, wait 5s and retry
  try {
    return await callGemini();
  } catch (firstError) {
    if (isRateLimitError(firstError)) {
      await delay(5000);
      try {
        return await callGemini();
      } catch {
        throw new Error(
          "AI service busy. Please try again in a minute. / AI ಸೇವೆ ನಿಧಾನವಾಗಿದೆ. ಒಂದು ನಿಮಿಷದ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
        );
      }
    }
    // Non-rate-limit error: retry once
    try {
      return await callGemini();
    } catch {
      throw firstError;
    }
  }
}
