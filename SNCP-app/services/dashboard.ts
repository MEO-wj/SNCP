import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { DashboardData, NutritionTrendResponse } from '@/types/dashboard';

export async function fetchTodayDashboard(token: string): Promise<DashboardData> {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/dashboard/today`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查网络后重试');
  }

  if (!resp.ok) {
    throw new Error('获取健康看板失败');
  }

  return (await resp.json()) as DashboardData;
}

export async function fetchNutritionTrend(token: string, days = 30): Promise<NutritionTrendResponse> {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/dashboard/trend?days=${days}`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查网络后重试');
  }

  if (!resp.ok) {
    throw new Error('获取趋势数据失败');
  }

  return (await resp.json()) as NutritionTrendResponse;
}
