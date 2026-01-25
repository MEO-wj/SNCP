export type HealthProfile = {
  gender?: string | null;
  birth_year?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  chronic_conditions?: string[];
  allergies?: string[];
  taste_preferences?: string[];
};

export type NutritionGoals = {
  calories_min?: number | null;
  calories_max?: number | null;
  protein_min?: number | null;
  protein_max?: number | null;
  fat_min?: number | null;
  fat_max?: number | null;
  carbs_min?: number | null;
  carbs_max?: number | null;
  sodium_max?: number | null;
  sugar_max?: number | null;
};
