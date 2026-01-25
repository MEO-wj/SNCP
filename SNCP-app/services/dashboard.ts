import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { DashboardData } from '@/types/dashboard';

export async function fetchTodayDashboard(token: string): Promise<DashboardData> {
  const resp = await fetch(`${getApiBaseUrl()}/dashboard/today`, {
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
  });
  if (!resp.ok) {
    throw new Error('获取健康看板失败');
  }
  return (await resp.json()) as DashboardData;
}

export async function fetchNutritionTrend(token: string, days = 30) {
  const resp = await fetch(`${getApiBaseUrl()}/dashboard/trend?days=${days}`, {
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
  });
  if (!resp.ok) {
    throw new Error('获取趋势失败');
  }
  return (await resp.json()) as {
    start: string;
    end: string;
    trend: Array<{ date: string; totals: Record<string, number> }>;
  };
}
