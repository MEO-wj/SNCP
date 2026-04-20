import type { NutritionValues } from '@/types/nutrition';

export type AiRecognizedItem = {
  name: string;
  food_name: string;
  canonical_name?: string;
  display_name?: string;
  category?: string;
  food_category?: string | null;
  confidence?: number | null;
  weight_g?: number | null;
  source?: string | null;
  nutrition?: Partial<NutritionValues>;
  matched?: boolean;
  notes?: string | null;
};

export type AiRecognitionResult = {
  items: AiRecognizedItem[];
  provider: string;
  message?: string;
  scene_summary?: string;
};

export type AiNutritionInsight = {
  summary: string;
  strengths: string[];
  risks: string[];
  next_actions: string[];
};

export type AiNutritionResult = {
  totals: Record<string, number>;
  macro_ratio: Record<string, number>;
  goal_checks: Record<string, unknown>[];
  warnings: string[];
  suggestions: string[];
  ai: {
    analysis: AiNutritionInsight;
    provider: string;
    message?: string;
  };
};

export type AiRecommendationItem = {
  recipe_id?: number | null;
  name: string;
  cuisine?: string | null;
  summary?: string;
  reason?: string;
  tags?: string[];
  suitable_for?: string[];
  nutrition?: Partial<NutritionValues>;
  source?: string;
  cover_url?: string | null;
  source_url?: string | null;
  source_provider?: string | null;
  ingredients?: { name: string; amount?: string }[];
  steps?: string[];
};

export type AiRecommendationResult = {
  items: AiRecommendationItem[];
  provider: string;
  message?: string;
};
