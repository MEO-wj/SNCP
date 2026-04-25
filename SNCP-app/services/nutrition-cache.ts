import { getUserProfileRaw } from '@/storage/auth-storage';
import { getItem, setItem } from '@/storage/universal-storage';
import type { RecipePost } from '@/services/recipe-posts';
import type { DashboardData, NutritionTrendPoint } from '@/types/dashboard';

type StoredUserProfile = {
  id?: string;
  phone?: string;
};

export type HomeExperienceCache = {
  dashboard: DashboardData;
  trend: NutritionTrendPoint[];
  updatedAt: string;
};

export type TrendExperienceCache = {
  days: number;
  trend: NutritionTrendPoint[];
  updatedAt: string;
};

export type RecommendExperienceCache = {
  keyword: string;
  recipePosts: RecipePost[];
  recommendationPosts: RecipePost[];
  usingDemoData: boolean;
  provider: string;
  message: string;
  updatedAt: string;
};

const HOME_CACHE_PREFIX = 'nutrition:home';
const TREND_CACHE_PREFIX = 'nutrition:trend';
const RECOMMEND_CACHE_PREFIX = 'nutrition:recommend:library-only-rules-v2';
const inMemoryCache = new Map<string, string>();

function buildTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeKeyword(keyword: string) {
  return (keyword || '').trim().toLowerCase();
}

async function getUserScope() {
  const rawProfile = await getUserProfileRaw();
  if (!rawProfile) {
    return null;
  }

  try {
    const profile = JSON.parse(rawProfile) as StoredUserProfile;
    return (profile.id || profile.phone || '').trim() || null;
  } catch {
    return null;
  }
}

async function readParsedCache<T>(key: string): Promise<T | null> {
  const cachedRaw = inMemoryCache.get(key);
  const raw = cachedRaw ?? (await getItem(key));
  if (!raw) {
    return null;
  }

  if (!cachedRaw) {
    inMemoryCache.set(key, raw);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeParsedCache(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  inMemoryCache.set(key, raw);
  await setItem(key, raw);
}

export async function readHomeExperienceCache() {
  const userScope = await getUserScope();
  if (!userScope) {
    return null;
  }

  return readParsedCache<HomeExperienceCache>(`${HOME_CACHE_PREFIX}:${userScope}:${buildTodayKey()}`);
}

export async function writeHomeExperienceCache(dashboard: DashboardData, trend: NutritionTrendPoint[]) {
  const userScope = await getUserScope();
  if (!userScope) {
    return;
  }

  const dayKey = (dashboard.date || '').trim() || buildTodayKey();
  await writeParsedCache(`${HOME_CACHE_PREFIX}:${userScope}:${dayKey}`, {
    dashboard,
    trend,
    updatedAt: new Date().toISOString(),
  } satisfies HomeExperienceCache);
}

export async function readTrendExperienceCache(days = 30) {
  const userScope = await getUserScope();
  if (!userScope) {
    return null;
  }

  return readParsedCache<TrendExperienceCache>(`${TREND_CACHE_PREFIX}:${userScope}:${days}:${buildTodayKey()}`);
}

export async function writeTrendExperienceCache(days: number, trend: NutritionTrendPoint[]) {
  const userScope = await getUserScope();
  if (!userScope) {
    return;
  }

  await writeParsedCache(`${TREND_CACHE_PREFIX}:${userScope}:${days}:${buildTodayKey()}`, {
    days,
    trend,
    updatedAt: new Date().toISOString(),
  } satisfies TrendExperienceCache);
}

export async function readRecommendExperienceCache(keyword = '') {
  const userScope = await getUserScope();
  if (!userScope) {
    return null;
  }

  return readParsedCache<RecommendExperienceCache>(
    `${RECOMMEND_CACHE_PREFIX}:${userScope}:${normalizeKeyword(keyword) || '__default__'}`,
  );
}

export async function writeRecommendExperienceCache(
  keyword: string,
  payload: Omit<RecommendExperienceCache, 'keyword' | 'updatedAt'>,
) {
  const userScope = await getUserScope();
  if (!userScope) {
    return;
  }

  const normalizedKeyword = normalizeKeyword(keyword) || '__default__';
  await writeParsedCache(`${RECOMMEND_CACHE_PREFIX}:${userScope}:${normalizedKeyword}`, {
    ...payload,
    keyword: normalizeKeyword(keyword),
    updatedAt: new Date().toISOString(),
  } satisfies RecommendExperienceCache);
}
