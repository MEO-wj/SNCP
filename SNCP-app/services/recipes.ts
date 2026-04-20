import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { Recipe } from '@/types/recipe';

export async function fetchRecipes(token: string, keyword?: string, tag?: string) {
  const params = new URLSearchParams();
  if (keyword) {
    params.set('keyword', keyword);
  }
  if (tag) {
    params.set('tag', tag);
  }

  const query = params.toString();
  const resp = await fetch(`${getApiBaseUrl()}/recipes${query ? `?${query}` : ''}`, {
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
  });

  if (!resp.ok) {
    throw new Error('获取食谱失败');
  }

  return (await resp.json()) as { recipes: Recipe[] };
}

export async function createRecipe(token: string, payload: Partial<Recipe>) {
  const resp = await fetch(`${getApiBaseUrl()}/recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const data = (await resp.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || '创建食谱失败');
  }

  return (await resp.json()) as { recipe: Recipe; created: boolean };
}

export async function updateRecipe(token: string, recipeId: number, payload: Partial<Recipe>) {
  const resp = await fetch(`${getApiBaseUrl()}/recipes/${recipeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error('更新食谱失败');
  }

  return (await resp.json()) as { recipe: Recipe };
}

export async function deleteRecipe(token: string, recipeId: number) {
  const resp = await fetch(`${getApiBaseUrl()}/recipes/${recipeId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
  });

  if (!resp.ok) {
    throw new Error('删除食谱失败');
  }

  return (await resp.json()) as { deleted: boolean };
}
