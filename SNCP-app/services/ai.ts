import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';

export async function recognizeFoods(
  token: string,
  payload: { image_base64?: string; image_url?: string; hint_text?: string }
) {
  const resp = await fetch(`${getApiBaseUrl()}/ai/recognize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error('识别失败');
  }
  return (await resp.json()) as {
    items: Array<{ name: string; category?: string; confidence?: number; weight_g?: number }>;
    provider: string;
    message?: string;
  };
}

export async function analyzeNutrition(token: string, items: Array<Record<string, unknown>>) {
  const resp = await fetch(`${getApiBaseUrl()}/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify({ items }),
  });
  if (!resp.ok) {
    throw new Error('分析失败');
  }
  return (await resp.json()) as {
    totals: Record<string, number>;
    macro_ratio: Record<string, number>;
    goal_checks: Array<Record<string, unknown>>;
    warnings: string[];
    suggestions: string[];
    ai: Record<string, unknown>;
  };
}

export async function recommendRecipes(token: string, payload: Record<string, unknown>) {
  const resp = await fetch(`${getApiBaseUrl()}/ai/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error('推荐失败');
  }
  return (await resp.json()) as { items: Array<Record<string, unknown>>; provider: string };
}
