import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { Meal } from '@/types/meal';

async function buildApiError(resp: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  try {
    const raw = (await resp.text()).trim();
    if (raw) {
      const payload = JSON.parse(raw) as { error?: string; message?: string };
      message = payload.error || payload.message || fallbackMessage;
    }
  } catch {
    message = fallbackMessage;
  }
  throw new Error(message);
}

async function parseJsonResponse<T>(resp: Response, fallbackMessage: string): Promise<T> {
  const raw = (await resp.text()).trim();
  if (!raw) {
    throw new Error(`${fallbackMessage}：服务返回空响应`);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`${fallbackMessage}：服务返回的不是有效 JSON`);
  }
}

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
    await buildApiError(resp, '获取餐次记录失败');
  }

  return parseJsonResponse<{ date: string; meals: Meal[]; total_count?: number }>(resp, '获取餐次记录失败');
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
    throw new Error('服务端当前未部署餐次保存接口');
  }

  if (!resp.ok) {
    await buildApiError(resp, resp.status >= 500 ? '服务端保存餐次失败，请检查后端日志' : '创建餐次失败');
  }

  return parseJsonResponse<{ meal_id: number; created: boolean }>(resp, '创建餐次失败');
}

export async function deleteMeal(mealId: number, token: string) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/meals/${mealId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }

  if (resp.status === 404) {
    throw new Error('餐次不存在或已被删除');
  }

  if (!resp.ok) {
    await buildApiError(resp, '删除餐次失败');
  }

  if (resp.status === 204) {
    return;
  }

  const raw = (await resp.text()).trim();
  if (!raw) {
    return;
  }

  try {
    JSON.parse(raw);
  } catch {
    throw new Error('删除餐次失败：服务返回的不是有效 JSON');
  }
}
