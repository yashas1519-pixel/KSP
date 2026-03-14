/**
 * Claude API integration for AI-powered exercise plan generation.
 * SERVER-SIDE ONLY — called from API routes.
 */

import "server-only";

import type { ExercisePlanInput, ExercisePlanOutput } from "@/types/exercise";
import { BMI_CATEGORY_LABELS } from "@/constants/bmi";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are a certified fitness trainer specialising in physical training 
for Karnataka State Police personnel.

Respond ONLY with valid JSON. No preamble or markdown.

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

export async function generateExercisePlan(
  input: ExercisePlanInput
): Promise<ExercisePlanOutput> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const userPrompt = buildExercisePrompt(input);

  async function callClaude(): Promise<ExercisePlanOutput> {
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

    const textBlock = data.content?.find(
      (block: { type: string }) => block.type === "text"
    );
    if (!textBlock?.text) {
      throw new Error("No text content in Claude response");
    }

    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonText);

    if (!validateExercisePlan(parsed)) {
      throw new Error("Claude returned invalid exercise plan structure");
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
