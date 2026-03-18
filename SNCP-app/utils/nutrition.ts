import type { Meal, MealItem } from '@/types/meal';
import type { NutritionValues } from '@/types/nutrition';

export const EMPTY_NUTRITION: NutritionValues = {
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
  sodium: 0,
  sugar: 0,
};

type NutritionInput = Partial<NutritionValues> | Record<string, number> | null | undefined;

function toNumber(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export function scaleNutrition(nutrition: NutritionInput, weightG?: number | null): NutritionValues {
  const factor = weightG && weightG > 0 ? weightG / 100 : 1;
  return {
    calories: toNumber(nutrition?.calories) * factor,
    protein: toNumber(nutrition?.protein) * factor,
    fat: toNumber(nutrition?.fat) * factor,
    carbs: toNumber(nutrition?.carbs) * factor,
    fiber: toNumber(nutrition?.fiber) * factor,
    sodium: toNumber(nutrition?.sodium) * factor,
    sugar: toNumber(nutrition?.sugar) * factor,
  };
}

export function sumNutritionValues(...values: NutritionValues[]): NutritionValues {
  return values.reduce(
    (acc, value) => ({
      calories: acc.calories + value.calories,
      protein: acc.protein + value.protein,
      fat: acc.fat + value.fat,
      carbs: acc.carbs + value.carbs,
      fiber: acc.fiber + value.fiber,
      sodium: acc.sodium + value.sodium,
      sugar: acc.sugar + value.sugar,
    }),
    EMPTY_NUTRITION,
  );
}

export function sumMealItemsNutrition(items: MealItem[]): NutritionValues {
  return items.reduce(
    (acc, item) => sumNutritionValues(acc, scaleNutrition(item.nutrition, item.weight_g)),
    EMPTY_NUTRITION,
  );
}

export function sumMealsNutrition(meals: Meal[]): NutritionValues {
  return meals.reduce((acc, meal) => sumNutritionValues(acc, sumMealItemsNutrition(meal.items || [])), EMPTY_NUTRITION);
}

export function formatNutritionValue(value: number, digits = 1) {
  if (!Number.isFinite(value)) {
    return '0';
  }
  if (Math.abs(value) >= 100) {
    return String(Math.round(value));
  }
  return value.toFixed(digits).replace(/\.0$/, '');
}
