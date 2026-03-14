import { BMICategory, BMI_CUTOFFS } from "@/constants/bmi";

/**
 * Calculate BMI using weight in kg and height in cm.
 *
 * Formula: BMI = weight(kg) / height(m)²
 *
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimetres
 * @returns BMI rounded to one decimal place
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  if (weightKg <= 0) throw new Error("Weight must be greater than zero");
  if (heightCm <= 0) throw new Error("Height must be greater than zero");

  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);

  return Math.round(bmi * 10) / 10;
}

/**
 * Classify a BMI value using Indian WHO cutoffs for the
 * Asia-Pacific population.
 *
 * | Category      | Range           |
 * |---------------|-----------------|
 * | Underweight   | below 18.5      |
 * | Normal        | 18.5 – 22.9     |
 * | Overweight    | 23.0 – 24.9     |
 * | Obese Class I | 25.0 – 29.9     |
 * | Obese Class II| 30.0 and above  |
 *
 * @param bmi - The BMI value to classify
 * @returns The BMI category
 */
export function classifyBMI(bmi: number): BMICategory {
  if (bmi < 0) throw new Error("BMI cannot be negative");

  const cutoff = BMI_CUTOFFS.find((c) => bmi >= c.min && bmi <= c.max);

  return cutoff?.category ?? BMICategory.OBESE_2;
}
