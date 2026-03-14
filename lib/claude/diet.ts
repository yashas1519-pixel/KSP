/**
 * Claude API integration for AI-powered diet plan generation.
 *
 * This module is SERVER-SIDE ONLY. All Claude API calls must
 * be made from Next.js API routes or server actions.
 */

import "server-only";

import type { DietGenerationRequest, DietPlan } from "@/types/diet";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are a certified nutritionist AI assistant for the Karnataka State Police fitness program. 
Your role is to generate personalised diet plans based on staff health metrics (BMI, weight, height) and dietary preferences. 
Use Indian dietary patterns and locally available foods. 
All plans should follow Indian WHO BMI guidelines for Asian populations.
Respond with structured JSON diet plans only.`;

export async function generateDietPlan(
  request: DietGenerationRequest
): Promise<DietPlan | null> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const userPrompt = buildDietPrompt(request);

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();

  // TODO: Parse and validate AI response into DietPlan structure
  return data as DietPlan;
}

function buildDietPrompt(request: DietGenerationRequest): string {
  return `Generate a personalised diet plan for a person with the following details:
- BMI: ${request.bmi}
- Weight: ${request.weightKg} kg
- Height: ${request.heightCm} cm
- Goal: ${request.goal.replace("_", " ")}
${request.dietaryPreferences?.length ? `- Dietary Preferences: ${request.dietaryPreferences.join(", ")}` : ""}
${request.allergies?.length ? `- Allergies: ${request.allergies.join(", ")}` : ""}

Please provide a structured diet plan with breakfast, lunch, dinner, and snacks.
Include calorie counts and macronutrient breakdown for each meal.
Use Indian food items commonly available in Karnataka.`;
}
