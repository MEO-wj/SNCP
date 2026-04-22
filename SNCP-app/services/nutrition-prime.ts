import { fetchNutritionTrend, fetchTodayDashboard } from '@/services/dashboard';
import { writeHomeExperienceCache } from '@/services/nutrition-cache';

export function primeNutritionExperience(token: string) {
  void Promise.allSettled([fetchTodayDashboard(token), fetchNutritionTrend(token, 7)])
    .then(async ([dashboardResult, trendResult]) => {
      if (dashboardResult.status !== 'fulfilled' || trendResult.status !== 'fulfilled') {
        return;
      }

      await writeHomeExperienceCache(dashboardResult.value, trendResult.value.trend || []);
    })
    .catch(() => {});
}
