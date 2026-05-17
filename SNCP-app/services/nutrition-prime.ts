import { fetchNutritionTrend, fetchTodayDashboard } from '@/services/dashboard';
import { recommendRecipes } from '@/services/ai';
import {
  writeHomeExperienceCache,
  writeRecommendExperienceCache,
  type RecommendExperienceCache,
} from '@/services/nutrition-cache';
import {
  buildRecommendationPosts,
  cacheRecipePosts,
  mapLibraryRecipesToPosts,
  type RecipePost,
} from '@/services/recipe-posts';

const RECOMMENDATION_POOL_LIMIT = 16;
const recommendationPrimeTasks = new Map<string, Promise<RecommendExperienceCache | null>>();

function getRecipeNameKey(recipeName: string) {
  return recipeName.trim().replace(/\s+/g, '').toLowerCase();
}

function keepLibraryPosts(posts: RecipePost[]): RecipePost[] {
  return posts.filter((post) => post.source === 'library');
}

function getLocalRecipeNameSet(posts: RecipePost[]) {
  return new Set(
    posts
      .filter((post) => post.libraryScope === 'local')
      .map((post) => getRecipeNameKey(post.name))
      .filter(Boolean),
  );
}

function markPostsWithLocalNames(posts: RecipePost[], localNameSet: Set<string>): RecipePost[] {
  return posts.map((post) => {
    if (!localNameSet.has(getRecipeNameKey(post.name))) {
      return post;
    }
    return {
      ...post,
      libraryScope: 'local',
    };
  });
}

export function primeRecommendationExperience(token: string, keyword = '') {
  const normalizedKeyword = keyword.trim();
  const taskKey = `${token}:${normalizedKeyword.toLowerCase()}`;
  const existingTask = recommendationPrimeTasks.get(taskKey);
  if (existingTask) {
    return existingTask;
  }

  const task = (async () => {
    try {
      const aiResult = await recommendRecipes(token, {
        ai_enhance: true,
        keyword: normalizedKeyword || undefined,
        recommendation_limit: RECOMMENDATION_POOL_LIMIT,
      });
      const recipePosts = keepLibraryPosts(
        mapLibraryRecipesToPosts([...(aiResult.local_recipes || []), ...(aiResult.server_recipes || [])]),
      );
      const recommendationPosts = markPostsWithLocalNames(
        keepLibraryPosts(buildRecommendationPosts(aiResult.items || [], recipePosts)),
        getLocalRecipeNameSet(recipePosts),
      );
      const payload = {
        recipePosts,
        recommendationPosts,
        usingDemoData: false,
        provider: aiResult.provider || '',
        message: aiResult.message || '',
      };

      cacheRecipePosts([...recipePosts, ...recommendationPosts]);
      await writeRecommendExperienceCache(normalizedKeyword, payload);
      return {
        keyword: normalizedKeyword.toLowerCase(),
        ...payload,
        updatedAt: new Date().toISOString(),
      } satisfies RecommendExperienceCache;
    } catch (error) {
      console.warn('[NutritionPrime] recommendation prime failed', error);
      return null;
    }
  })();

  recommendationPrimeTasks.set(taskKey, task);
  void task.finally(() => {
    if (recommendationPrimeTasks.get(taskKey) === task) {
      recommendationPrimeTasks.delete(taskKey);
    }
  });
  return task;
}

export function primeNutritionExperience(token: string) {
  void Promise.allSettled([fetchTodayDashboard(token), fetchNutritionTrend(token, 7), primeRecommendationExperience(token)])
    .then(async ([dashboardResult, trendResult]) => {
      if (dashboardResult.status !== 'fulfilled' || trendResult.status !== 'fulfilled') {
        return;
      }

      await writeHomeExperienceCache(dashboardResult.value, trendResult.value.trend || []);
    })
    .catch(() => {});
}
