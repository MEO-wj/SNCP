import type { NutritionValues } from '@/types/nutrition';

export type MealItem = {
  id?: number;
  meal_id?: number;
  food_name: string;
  food_category?: string | null;
  weight_g?: number | null;
  source?: string | null;
  nutrition?: Partial<NutritionValues>;
};

export type Meal = {
  id: number;
  meal_type: string;
  eaten_at: string;
  note?: string | null;
  items: MealItem[];
};
