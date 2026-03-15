/**
 * Google Gemini API integration for AI-powered exercise plan generation.
 * SERVER-SIDE ONLY — called from API routes.
 */

import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExercisePlanInput, ExercisePlanOutput } from "@/types/exercise";
import { BMI_CATEGORY_LABELS } from "@/constants/bmi";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `You are a certified fitness trainer specialising in physical training 
for Karnataka State Police personnel.

You must respond with ONLY a valid JSON object. No explanation, no markdown, no code blocks. Raw JSON only starting with { and ending with }.

Rules:
- Plans must follow Karnataka Police PT (physical training) standards
- Underweight: strength + calorie surplus focus
- Normal: maintenance cardio + conditioning
- Overweight: moderate cardio + strength
- Obese I/II: low-impact progressive routine only
- Heart condition or hypertension: no high-intensity exercises
- All exercise names in English and Kannada
- Duration in minutes, sets and reps clearly stated

JSON structure:
{
  "weeklyPlan": [
    {
      "day": "Monday",
      "dayKn": "ಸೋಮವಾರ",
      "focus": "",
      "focusKn": "",
      "exercises": [
        {
          "nameEn": "",
          "nameKn": "",
          "sets": 0,
          "reps": "",
          "durationMinutes": 0,
          "notes": ""
        }
      ],
      "totalDurationMinutes": 0,
      "restDay": false
    }
  ],
  "weeklyNotes": {
    "en": "",
    "kn": ""
  }
}`;

function buildExercisePrompt(input: ExercisePlanInput): string {
  const category = BMI_CATEGORY_LABELS[input.bmiCategory];
  const conditions = input.existingConditions.length > 0
    ? input.existingConditions.join(", ")
    : "None";

  return `Generate a 7-day personalised exercise plan for a Karnataka Police staff member:
- BMI Category: ${category}
- Age: ${input.ageYears} years
- Gender: ${input.gender}
- Duty Type: ${input.dutyType}
- Existing Conditions: ${conditions}

Include at least 1 rest day. All exercise names in English and Kannada.
Provide a complete weekly plan (Monday through Sunday).`;
}

function validateExercisePlan(data: unknown): data is ExercisePlanOutput {
  if (typeof data !== "object" || data === null) return false;
  const plan = data as Record<string, unknown>;

  if (!Array.isArray(plan.weeklyPlan) || plan.weeklyPlan.length === 0) return false;
  if (typeof plan.weeklyNotes !== "object" || plan.weeklyNotes === null) return false;

  // Validate the first day has the right structure
  const day = plan.weeklyPlan[0] as Record<string, unknown>;
  if (typeof day.day !== "string") return false;
  if (typeof day.restDay !== "boolean") return false;

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

export async function generateExercisePlan(
  input: ExercisePlanInput
): Promise<ExercisePlanOutput> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const userPrompt = buildExercisePrompt(input);
  const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;

  async function callGemini(): Promise<ExercisePlanOutput> {
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

    if (!validateExercisePlan(parsed)) {
      throw new Error("Gemini returned invalid exercise plan structure");
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
