import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { Meal } from '@/types/meal';

export async function fetchMealsByDate(date: string, token: string) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/meals?date=${date}`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }
  if (!resp.ok) {
    throw new Error('获取饮食记录失败');
  }
  return (await resp.json()) as { date: string; meals: Meal[] };
}

export async function createMeal(payload: Record<string, unknown>, token: string) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/meals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }
  if (resp.status === 405 || resp.status === 404) {
    throw new Error('服务器当前未部署餐次保存接口');
  }
  if (resp.status >= 500) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error.error || '服务器保存餐次失败，请检查后端日志');
  }
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error.error || '创建失败');
  }
  return (await resp.json()) as { meal_id: number };
}
