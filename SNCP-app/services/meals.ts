import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { Meal } from '@/types/meal';

export async function fetchMealsByDate(date: string, token: string) {
  const resp = await fetch(`${getApiBaseUrl()}/meals?date=${date}`, {
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
  });
  if (!resp.ok) {
    throw new Error('获取饮食记录失败');
  }
  return (await resp.json()) as { date: string; meals: Meal[] };
}

export async function createMeal(payload: Record<string, unknown>, token: string) {
  const resp = await fetch(`${getApiBaseUrl()}/meals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error.error || '创建失败');
  }
  return (await resp.json()) as { meal_id: number };
}
