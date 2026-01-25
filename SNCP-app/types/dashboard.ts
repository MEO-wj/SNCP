export type NutritionTotals = {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sodium: number;
  sugar: number;
};

export type MacroRatio = {
  protein: number;
  fat: number;
  carbs: number;
};

export type DashboardData = {
  date: string;
  meal_count: number;
  totals: NutritionTotals;
  macro_ratio: MacroRatio;
  goal_checks: Array<{
    name: string;
    value: number;
    min?: number | null;
    max?: number | null;
    status: 'ok' | 'low' | 'high';
  }>;
  warnings: string[];
  suggestions: string[];
  score: number;
};
