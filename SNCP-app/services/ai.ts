import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type {
  AiNutritionResult,
  AiRecognitionResult,
  AiRecommendationResult,
} from '@/types/ai';

async function buildApiError(resp: Response, fallbackMessage: string): Promise<never> {
  let message = fallbackMessage;
  try {
    const payload = (await resp.json()) as { error?: string; message?: string };
    message = payload.error || payload.message || fallbackMessage;
  } catch {
    message = fallbackMessage;
  }
  throw new Error(message);
}

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
    await buildApiError(resp, '识别失败');
  }
  return (await resp.json()) as AiRecognitionResult;
}

export async function analyzeNutrition(token: string, items: Record<string, unknown>[]) {
  const resp = await fetch(`${getApiBaseUrl()}/ai/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify({ items }),
  });
  if (!resp.ok) {
    await buildApiError(resp, '分析失败');
  }
  return (await resp.json()) as AiNutritionResult;
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
    await buildApiError(resp, '推荐失败');
  }
  return (await resp.json()) as AiRecommendationResult;
}
