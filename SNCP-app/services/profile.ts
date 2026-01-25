import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { HealthProfile, NutritionGoals } from '@/types/profile';

export async function fetchProfile(token: string) {
  const resp = await fetch(`${getApiBaseUrl()}/profile`, {
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
  });
  if (!resp.ok) {
    throw new Error('获取档案失败');
  }
  return (await resp.json()) as { profile: HealthProfile };
}

export async function updateProfile(payload: HealthProfile, token: string) {
  const resp = await fetch(`${getApiBaseUrl()}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error('更新档案失败');
  }
  return (await resp.json()) as { profile: HealthProfile };
}

export async function fetchGoals(token: string) {
  const resp = await fetch(`${getApiBaseUrl()}/profile/goals`, {
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
  });
  if (!resp.ok) {
    throw new Error('获取目标失败');
  }
  return (await resp.json()) as { goals: NutritionGoals };
}

export async function updateGoals(payload: NutritionGoals, token: string) {
  const resp = await fetch(`${getApiBaseUrl()}/profile/goals`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error('更新目标失败');
  }
  return (await resp.json()) as { goals: NutritionGoals };
}
