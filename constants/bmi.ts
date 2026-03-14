/**
 * Indian WHO BMI Classification Cutoffs
 *
 * These cutoffs are specific to the Indian/Asian population
 * as recommended by the WHO for the Asia-Pacific region.
 */

export enum BMICategory {
  UNDERWEIGHT = "UNDERWEIGHT",
  NORMAL = "NORMAL",
  OVERWEIGHT = "OVERWEIGHT",
  OBESE_1 = "OBESE_1",
  OBESE_2 = "OBESE_2",
}

export interface BMICutoff {
  category: BMICategory;
  label: string;
  min: number;
  max: number;
}

export const BMI_CUTOFFS: BMICutoff[] = [
  {
    category: BMICategory.UNDERWEIGHT,
    label: "Underweight",
    min: 0,
    max: 18.49,
  },
  {
    category: BMICategory.NORMAL,
    label: "Normal",
    min: 18.5,
    max: 22.9,
  },
  {
    category: BMICategory.OVERWEIGHT,
    label: "Overweight",
    min: 23,
    max: 24.9,
  },
  {
    category: BMICategory.OBESE_1,
    label: "Obese Class I",
    min: 25,
    max: 29.9,
  },
  {
    category: BMICategory.OBESE_2,
    label: "Obese Class II",
    min: 30,
    max: Infinity,
  },
];

export const BMI_CATEGORY_LABELS: Record<BMICategory, string> = {
  [BMICategory.UNDERWEIGHT]: "Underweight",
  [BMICategory.NORMAL]: "Normal",
  [BMICategory.OVERWEIGHT]: "Overweight",
  [BMICategory.OBESE_1]: "Obese Class I",
  [BMICategory.OBESE_2]: "Obese Class II",
};
