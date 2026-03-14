/**
 * Claude API integration for AI-powered diet plan generation.
 * SERVER-SIDE ONLY — called from API routes.
 */

import "server-only";

import type { DietPlanInput, DietPlanOutput } from "@/types/diet";
import { BMI_CATEGORY_LABELS } from "@/constants/bmi";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are a certified nutritionist and fitness expert specialising in 
diet plans for Indian police personnel in Karnataka, India.

You must respond ONLY with a valid JSON object. No preamble, no 
markdown, no explanation — raw JSON only.

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

export async function generateDietPlan(
  input: DietPlanInput
): Promise<DietPlanOutput> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const userPrompt = buildDietPrompt(input);

  async function callClaude(): Promise<DietPlanOutput> {
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Claude API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();

    // Extract text content from Claude response
    const textBlock = data.content?.find(
      (block: { type: string }) => block.type === "text"
    );
    if (!textBlock?.text) {
      throw new Error("No text content in Claude response");
    }

    // Parse JSON from response (handle possible markdown wrapping)
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText);

    if (!validateDietPlan(parsed)) {
      throw new Error("Claude returned invalid diet plan structure");
    }

    return parsed;
  }

  // Try once; if invalid JSON, retry once
  try {
    return await callClaude();
  } catch (firstError) {
    try {
      return await callClaude();
    } catch {
      throw firstError;
    }
  }
}
