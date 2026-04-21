import type { NutritionValues } from '@/types/nutrition';

export type NutritionTotals = NutritionValues;

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
  goal_checks: {
    name: string;
    value: number;
    min?: number | null;
    max?: number | null;
    status: 'ok' | 'low' | 'high';
  }[];
  warnings: string[];
  suggestions: string[];
  score: number;
  score_breakdown?: {
    rule_score: number;
    ai_score: number;
    rule_weight: number;
    ai_weight: number;
  };
  ai?: {
    provider: string;
    score: number;
    summary: string;
    strengths: string[];
    risks: string[];
    next_actions: string[];
  };
};

export type NutritionTrendPoint = {
  date: string;
  totals: NutritionTotals;
};

export type NutritionTrendResponse = {
  start: string;
  end: string;
  trend: NutritionTrendPoint[];
};
