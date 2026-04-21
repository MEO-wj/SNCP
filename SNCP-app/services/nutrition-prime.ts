import { recommendRecipes } from '@/services/ai';
import { fetchNutritionTrend, fetchTodayDashboard } from '@/services/dashboard';

export function primeNutritionExperience(token: string) {
  void Promise.allSettled([
    fetchTodayDashboard(token),
    fetchNutritionTrend(token, 7),
    recommendRecipes(token, { refresh_round: 0 }),
  ]).catch(() => {});
}
