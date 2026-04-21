import type { NutritionGoals } from '@/types/profile';

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = {
  calories_min: 1800,
  calories_max: 2200,
  protein_min: 55,
  protein_max: 90,
};

export function formatNutritionGoalRange(min?: number | null, max?: number | null, unit = '') {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;

  if (!hasMin && !hasMax) {
    return '';
  }

  const low = hasMin ? String(min) : '--';
  const high = hasMax ? String(max) : '--';
  return `${low}-${high}${unit}`;
}

export function hasConfiguredNutritionGoals(goals?: NutritionGoals | null) {
  if (!goals) {
    return false;
  }

  return [
    goals.calories_min,
    goals.calories_max,
    goals.protein_min,
    goals.protein_max,
    goals.fat_min,
    goals.fat_max,
    goals.carbs_min,
    goals.carbs_max,
    goals.sodium_max,
    goals.sugar_max,
  ].some((value) => value !== null && value !== undefined);
}

export function getDefaultNutritionGoalsSummary() {
  const calories = formatNutritionGoalRange(
    DEFAULT_NUTRITION_GOALS.calories_min,
    DEFAULT_NUTRITION_GOALS.calories_max,
    'kcal',
  );
  const protein = formatNutritionGoalRange(
    DEFAULT_NUTRITION_GOALS.protein_min,
    DEFAULT_NUTRITION_GOALS.protein_max,
    'g',
  );

  return `热量 ${calories} · 蛋白 ${protein}`;
}
