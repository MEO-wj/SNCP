import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { Recipe } from '@/types/recipe';

export type RecipeScope = 'all' | 'local' | 'server';

export async function fetchRecipes(
  token: string,
  keyword?: string,
  tag?: string,
  scope: RecipeScope = 'all',
) {
  const params = new URLSearchParams();
  if (keyword) {
    params.set('keyword', keyword);
  }
  if (tag) {
    params.set('tag', tag);
  }
  if (scope !== 'all') {
    params.set('scope', scope);
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

export async function createRecipe(
  token: string,
  payload: Partial<Recipe>,
  scope: RecipeScope = 'local',
) {
  const resp = await fetch(`${getApiBaseUrl()}/recipes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify({ ...payload, scope }),
  });

  if (!resp.ok) {
    const data = (await resp.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || '创建食谱失败');
  }

  return (await resp.json()) as { recipe: Recipe; created: boolean };
}

export async function updateRecipe(
  token: string,
  recipeId: number,
  payload: Partial<Recipe>,
  scope: RecipeScope = 'local',
) {
  const resp = await fetch(`${getApiBaseUrl()}/recipes/${recipeId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify({ ...payload, scope }),
  });

  if (!resp.ok) {
    const data = (await resp.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || '更新食谱失败');
  }

  return (await resp.json()) as { recipe: Recipe };
}

export async function deleteRecipe(token: string, recipeId: number, scope: RecipeScope = 'local') {
  const params = new URLSearchParams();
  if (scope !== 'all') {
    params.set('scope', scope);
  }
  const resp = await fetch(
    `${getApiBaseUrl()}/recipes/${recipeId}${params.toString() ? `?${params.toString()}` : ''}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    },
  );

  if (!resp.ok) {
    const data = (await resp.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || '删除食谱失败');
  }

  return (await resp.json()) as { deleted: boolean };
}
