import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowsClockwise, Sparkle } from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { RecipeCoverPlaceholder } from '@/components/recipe-cover-placeholder';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { useUserProfile } from '@/hooks/use-user-profile';
import { recommendRecipes } from '@/services/ai';
import {
  buildRecommendationPosts,
  cacheRecipePosts,
  getRecipeCover,
  hasRecipeCover,
  mapLibraryRecipesToPosts,
  type RecipePost,
} from '@/services/recipe-posts';
import { createRecipe, fetchRecipes } from '@/services/recipes';
import {
  readRecommendExperienceCache,
  writeRecommendExperienceCache,
  type RecommendExperienceCache,
} from '@/services/nutrition-cache';
import { subscribeNutritionRefresh } from '@/services/nutrition-refresh';
import type { Recipe } from '@/types/recipe';

type LoadOptions = {
  excludeNames?: string[];
  refreshRound?: number;
  silent?: boolean;
};

const RECOMMEND_CACHE_FRESH_MS = 15 * 60 * 1000;

function getProviderLabel(provider: string): string {
  switch (provider) {
    case 'zhipu':
      return '智谱 AI';
    case 'rules':
      return '本地规则';
    case 'remote':
      return '远程服务';
    default:
      return provider;
  }
}

function getRecipeMetaText(recipe: RecipePost): string {
  const tagText = recipe.tags.slice(0, 2).join('、');
  return `食谱库 · ${tagText || recipe.cuisine || '健康食谱'}`;
}

function keepLibraryPosts(posts: RecipePost[]): RecipePost[] {
  return posts.filter((post) => post.source === 'library');
}

function isFreshRecommendCache(cached: RecommendExperienceCache | null): boolean {
  if (!cached?.updatedAt) {
    return false;
  }
  const updatedAt = new Date(cached.updatedAt).getTime();
  return Number.isFinite(updatedAt) && Date.now() - updatedAt < RECOMMEND_CACHE_FRESH_MS;
}

function upsertRecipePost(posts: RecipePost[], nextPost: RecipePost): RecipePost[] {
  const nextId = String(nextPost.id);
  const nextName = nextPost.name.trim().toLowerCase();
  const nextList = posts.filter((post) => {
    const currentId = String(post.id);
    const currentName = post.name.trim().toLowerCase();
    return currentId !== nextId && currentName !== nextName;
  });
  return [nextPost, ...nextList];
}

function getRecipeNameKey(recipeName: string) {
  return recipeName.trim().replace(/\s+/g, '').toLowerCase();
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

function isRecommendationHintSummary(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    return true;
  }
  return ['服务器食谱库', '本地食谱库', '搜索意图', '健康档案', '口味偏好', '候选', '命中'].some((keyword) =>
    normalized.includes(keyword),
  );
}

function buildRecipeSummaryFallback(post: RecipePost) {
  const firstStep = post.steps.find((step) => step.trim());
  if (firstStep) {
    return firstStep.trim();
  }
  if (post.tags.length > 0) {
    return `${post.name}主打${post.tags.slice(0, 2).join('、')}，适合作为日常健康餐。`;
  }
  return `${post.name}适合作为日常家常餐，营养均衡且容易上手。`;
}

function repairCachedRecommendationSummaries(posts: RecipePost[], libraryPosts: RecipePost[]): RecipePost[] {
  const libraryByName = new Map(libraryPosts.map((post) => [getRecipeNameKey(post.name), post] as const));
  return posts.map((post) => {
    if (!isRecommendationHintSummary(post.summary)) {
      return post;
    }

    const libraryPost = libraryByName.get(getRecipeNameKey(post.name));
    const summary = libraryPost?.summary || buildRecipeSummaryFallback(post);
    if (!summary || summary === post.summary) {
      return post;
    }

    return {
      ...post,
      summary,
    };
  });
}

function markRecipeAsLocal(posts: RecipePost[], recipeName: string): RecipePost[] {
  const normalizedName = getRecipeNameKey(recipeName);
  return posts.map((post) => {
    if (getRecipeNameKey(post.name) !== normalizedName) {
      return post;
    }
    return {
      ...post,
      libraryScope: 'local',
    };
  });
}

export default function RecommendScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const profile = useUserProfile();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [keyword, setKeyword] = useState('');
  const [recipePosts, setRecipePosts] = useState<RecipePost[]>([]);
  const [recommendationPosts, setRecommendationPosts] = useState<RecipePost[]>([]);
  const [provider, setProvider] = useState('');
  const [message, setMessage] = useState('');
  const [noticeText, setNoticeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [refreshRound, setRefreshRound] = useState(0);

  const isAdmin = Boolean(profile?.roles?.includes('admin') || profile?.roles?.includes('webmaster'));

  const syncExperienceCache = useCallback(
    async (nextKeyword: string, nextRecipePosts: RecipePost[], nextRecommendationPosts: RecipePost[], nextProvider: string, nextMessage: string) => {
      cacheRecipePosts([...nextRecipePosts, ...nextRecommendationPosts]);
      await writeRecommendExperienceCache(nextKeyword, {
        recipePosts: nextRecipePosts,
        recommendationPosts: nextRecommendationPosts,
        usingDemoData: false,
        provider: nextProvider,
        message: nextMessage,
      });
    },
    [],
  );

  const applyCachedState = useCallback((cached: RecommendExperienceCache | null) => {
    if (!cached) {
      return false;
    }

    const cachedRecipes = keepLibraryPosts(cached.recipePosts);
    const cachedRecommendations = repairCachedRecommendationSummaries(
      markPostsWithLocalNames(keepLibraryPosts(cached.recommendationPosts), getLocalRecipeNameSet(cachedRecipes)),
      cachedRecipes,
    );
    cacheRecipePosts([...cachedRecipes, ...cachedRecommendations]);
    setRecipePosts(cachedRecipes);
    setRecommendationPosts(cachedRecommendations);
    setProvider(cached.provider);
    setMessage(cached.message);
    setNoticeText('');
    return cachedRecipes.length > 0 || cachedRecommendations.length > 0;
  }, []);

  const localRecipePosts = useMemo(
    () => (isAdmin ? recipePosts : recipePosts.filter((post) => post.libraryScope === 'local')),
    [isAdmin, recipePosts],
  );
  const localRecipeNameSet = useMemo(() => getLocalRecipeNameSet(recipePosts), [recipePosts]);

  const handleOpenRecipe = useCallback(
    (recipe: RecipePost) => {
      router.push({
        pathname: '/recipes/[postId]',
        params: { postId: recipe.id },
      });
    },
    [router],
  );

  const load = useCallback(
    async (nextKeyword = '', options?: LoadOptions) => {
      if (!token) {
        return;
      }

      if (!options?.silent) {
        setLoading(true);
        setErrorText('');
      }

      try {
        let nextErrorText = '';

        const aiResult = await recommendRecipes(token, {
          ai_enhance: true,
          keyword: nextKeyword || undefined,
          exclude_names: options?.excludeNames?.length ? options.excludeNames : undefined,
          refresh_round: options?.refreshRound ?? 0,
        })
          .then((value) => ({ status: 'fulfilled' as const, value }))
          .catch((reason) => ({ status: 'rejected' as const, reason }));

        const localRecipes =
          aiResult.status === 'fulfilled'
            ? aiResult.value.local_recipes || []
            : await fetchRecipes(token, nextKeyword || undefined, undefined, 'local')
                .then((value) => value.recipes || [])
                .catch((reason) => {
                  console.warn('[Recommend] local library load failed', reason);
                  nextErrorText =
                    reason instanceof Error ? reason.message : '本地食谱库加载失败，请稍后重试。';
                  return [];
                });

        const serverRecipes =
          aiResult.status === 'fulfilled'
            ? aiResult.value.server_recipes || []
            : await fetchRecipes(token, nextKeyword || undefined, undefined, 'server')
                .then((value) => value.recipes || [])
                .catch((reason) => {
                  console.warn('[Recommend] server library load failed', reason);
                  const serverError =
                    reason instanceof Error ? reason.message : '食谱补充内容加载失败，请稍后重试。';
                  nextErrorText = nextErrorText ? `${nextErrorText} ${serverError}` : serverError;
                  return [];
                });

        const basePosts = keepLibraryPosts(
          mapLibraryRecipesToPosts([...(localRecipes || []), ...(serverRecipes || [])]),
        );
        const localNameSet = getLocalRecipeNameSet(basePosts);

        let nextRecommendationPosts: RecipePost[] = [];
        let nextProvider = '';
        let nextMessage = '';

        if (aiResult.status === 'fulfilled') {
          nextRecommendationPosts = keepLibraryPosts(
            buildRecommendationPosts(aiResult.value.items || [], basePosts),
          );
          nextRecommendationPosts = markPostsWithLocalNames(nextRecommendationPosts, localNameSet);
          nextProvider = aiResult.value.provider || '';
          nextMessage = aiResult.value.message || '';
        } else {
          console.warn('[Recommend] ai load failed', aiResult.reason);
          const aiErrorText =
            aiResult.reason instanceof Error ? aiResult.reason.message : 'AI 推荐加载失败。';
          nextErrorText = nextErrorText ? `${nextErrorText} ${aiErrorText}` : aiErrorText;
        }

        setRecipePosts(basePosts);
        setRecommendationPosts(nextRecommendationPosts);
        setProvider(nextProvider);
        setMessage(nextMessage);
        await syncExperienceCache(nextKeyword, basePosts, nextRecommendationPosts, nextProvider, nextMessage);

        if (!options?.silent || nextErrorText) {
          setErrorText(nextErrorText);
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [syncExperienceCache, token],
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const cached = await readRecommendExperienceCache('');
      if (cancelled) {
        return;
      }

      if (applyCachedState(cached)) {
        void load('', { refreshRound: 0, silent: true });
        return;
      }

      void load('', { refreshRound: 0 });
    })();

    return () => {
      cancelled = true;
    };
  }, [applyCachedState, load, token]);

  useEffect(() => {
    return subscribeNutritionRefresh(() => {
      void load(keyword, { refreshRound, silent: true });
    });
  }, [keyword, load, refreshRound]);

  const handleSearch = useCallback(() => {
    setRefreshRound(0);
    setNoticeText('');
    void (async () => {
      const cached = await readRecommendExperienceCache(keyword);
      const hasCache = applyCachedState(cached);
      if (hasCache && isFreshRecommendCache(cached)) {
        void load(keyword, { refreshRound: 0, silent: true });
        return;
      }
      void load(keyword, { refreshRound: 0, silent: hasCache });
    })();
  }, [applyCachedState, keyword, load]);

  const handleRefreshRecommendations = useCallback(() => {
    const nextRound = refreshRound + 1;
    setRefreshRound(nextRound);
    setNoticeText('');
    void load(keyword, {
      excludeNames: recommendationPosts.map((item) => item.name),
      refreshRound: nextRound,
    });
  }, [keyword, load, recommendationPosts, refreshRound]);

  const handleSaveToLocal = useCallback(
    async (recipe: RecipePost) => {
      if (!token) {
        return;
      }

      if (recipe.libraryScope === 'local' || localRecipeNameSet.has(getRecipeNameKey(recipe.name))) {
        const nextRecommendationPosts = markRecipeAsLocal(recommendationPosts, recipe.name);
        setRecommendationPosts(nextRecommendationPosts);
        await syncExperienceCache(keyword, recipePosts, nextRecommendationPosts, provider, message);
        return;
      }

      try {
        const response = await createRecipe(
          token,
          {
            name: recipe.name,
            cuisine: recipe.cuisine,
            tags: recipe.tags,
            suitable_for: recipe.suitableFor,
            ingredients: recipe.ingredients,
            steps: recipe.steps,
            cover_url: recipe.coverUrl,
            source_url: recipe.sourceUrl,
            source_provider: recipe.sourceProvider,
          },
          'local',
        );

        const nextLocalRecipe: Recipe = {
          ...response.recipe,
          library_scope: 'local',
          source: 'library',
        };
        const mappedPost = mapLibraryRecipesToPosts([nextLocalRecipe])[0];
        if (!mappedPost) {
          throw new Error('本地食谱同步失败，请稍后重试。');
        }

        const nextRecipePosts = upsertRecipePost(recipePosts, mappedPost);
        const nextRecommendationPosts = markRecipeAsLocal(recommendationPosts, mappedPost.name);

        setRecipePosts(nextRecipePosts);
        setRecommendationPosts(nextRecommendationPosts);
        setErrorText('');
        setNoticeText(`已将《${mappedPost.name}》加入本地食谱库`);
        await syncExperienceCache(keyword, nextRecipePosts, nextRecommendationPosts, provider, message);
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : '加入本地食谱库失败。');
      }
    },
    [
      keyword,
      localRecipeNameSet,
      message,
      provider,
      recipePosts,
      recommendationPosts,
      syncExperienceCache,
      token,
    ],
  );

  const renderRecipeCard = useCallback(
    (recipe: RecipePost, mode: 'recommend' | 'local') => {
      const inLocalLibrary = recipe.libraryScope === 'local' || localRecipeNameSet.has(getRecipeNameKey(recipe.name));
      const isAdminRecipe = isAdmin && mode === 'recommend';

      return (
        <View key={`${mode}-${recipe.id}`} style={styles.recipeGridCell}>
          <Pressable style={styles.recipeCard} onPress={() => handleOpenRecipe(recipe)}>
            {hasRecipeCover(recipe) ? (
              <Image source={getRecipeCover(recipe)} style={styles.recipeCover} contentFit="cover" />
            ) : (
              <RecipeCoverPlaceholder compact title={recipe.name} />
            )}
            <View style={styles.recipeBody}>
              <Text style={styles.recipeTitle} numberOfLines={2}>
                {recipe.name}
              </Text>
              <Text style={styles.recipeMeta} numberOfLines={1}>
                {getRecipeMetaText(recipe)}
              </Text>
              <Text style={styles.recipeSummary} numberOfLines={2}>
                {recipe.summary}
              </Text>
              {mode === 'local' || isAdminRecipe ? (
                <Pressable style={styles.recipeGhostButton} onPress={() => handleOpenRecipe(recipe)}>
                  <Text style={styles.recipeGhostButtonText}>查看详情</Text>
                </Pressable>
              ) : inLocalLibrary ? (
                <View style={styles.recipeDisabledButton}>
                  <Text style={styles.recipeDisabledButtonText}>已加入本地库</Text>
                </View>
              ) : (
                <Pressable style={styles.recipeAddButton} onPress={() => handleSaveToLocal(recipe)}>
                  <Text style={styles.recipeAddButtonText}>加入本地库</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </View>
      );
    },
    [handleOpenRecipe, handleSaveToLocal, isAdmin, localRecipeNameSet, styles],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Sparkle size={14} color={palette.orange500} weight="fill" />
            <Text style={styles.heroBadgeText}>智能推荐</Text>
          </View>
          <Text style={styles.title}>
            {isAdmin ? '先看食谱库，再按需刷新推荐' : '先搜本地食谱，不够时再帮你补充推荐'}
          </Text>
          <Text style={styles.heroText}>
            {isAdmin
              ? '管理员视角下，服务器食谱库就是你的食谱库，推荐结果可直接查看，不再区分加入本地库。'
              : '推荐会优先参考你已经加入本地食谱库的内容；还没加入的推荐菜可以直接一键加入，后续会更贴合你的常吃习惯。'}
          </Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={keyword}
            onChangeText={setKeyword}
            placeholder="输入关键词，比如高蛋白、早餐、低盐"
            placeholderTextColor={palette.stone400}
          />
          <Pressable style={styles.searchButton} onPress={handleSearch} disabled={loading}>
            <Text style={styles.searchButtonText}>{loading ? '加载中' : '搜索'}</Text>
          </Pressable>
        </View>

        {noticeText ? <Text style={styles.noticeText}>{noticeText}</Text> : null}
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>AI 推荐结果</Text>
            <View style={styles.sectionHeaderActions}>
              <Pressable
                style={[styles.refreshButton, loading && styles.refreshButtonDisabled]}
                onPress={handleRefreshRecommendations}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={palette.orange500} />
                ) : (
                  <ArrowsClockwise size={14} color={palette.orange500} weight="bold" />
                )}
                <Text style={styles.refreshButtonText}>{loading ? '刷新中' : '刷新推荐'}</Text>
              </Pressable>
              {provider ? (
                <View style={styles.providerChip}>
                  <Text style={styles.providerChipText}>{getProviderLabel(provider)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {message ? <Text style={styles.helperText}>{message}</Text> : null}

          {recommendationPosts.length === 0 ? (
            <Text style={styles.emptyText}>当前没有匹配的推荐，可以换个关键词再试试。</Text>
          ) : (
            <View style={styles.recipeGrid}>
              {recommendationPosts.map((recipe) => renderRecipeCard(recipe, 'recommend'))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{isAdmin ? '食谱库' : '本地食谱库'}</Text>
            <View style={styles.providerChip}>
              <Text style={styles.providerChipText}>{isAdmin ? '管理员可编辑' : '已加入'}</Text>
            </View>
          </View>

          {localRecipePosts.length === 0 ? (
            <Text style={styles.emptyText}>{isAdmin ? '食谱库里暂时没有匹配项。' : '本地食谱库里暂时没有匹配项。'}</Text>
          ) : (
            <View style={styles.recipeGrid}>
              {localRecipePosts.map((recipe) => renderRecipeCard(recipe, 'local'))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomDock
        activeTab="recommend"
        onHome={() => router.navigate('/(tabs)')}
        onRecord={() => router.navigate('/(tabs)/record')}
        onRecommend={() => router.navigate('/(tabs)/recommend')}
        onTrend={() => router.navigate('/(tabs)/trend')}
        onProfile={() => router.navigate('/(tabs)/settings')}
      />
    </SafeAreaView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 140,
      gap: 16,
    },
    heroCard: {
      backgroundColor: palette.white,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 10,
    },
    heroBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: palette.gold50,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    heroBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    title: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      color: palette.stone900,
    },
    heroText: {
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone600,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 10,
    },
    searchInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: palette.white,
      color: palette.stone800,
    },
    searchButton: {
      paddingHorizontal: 18,
      borderRadius: 16,
      backgroundColor: palette.gold500,
      justifyContent: 'center',
    },
    searchButtonText: {
      color: palette.white,
      fontWeight: '700',
    },
    errorText: {
      fontSize: 13,
      color: palette.imperial500,
    },
    noticeText: {
      fontSize: 13,
      color: palette.green500,
    },
    section: {
      gap: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    providerChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: palette.surfaceWarm,
    },
    providerChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone700,
    },
    refreshButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
    },
    refreshButtonDisabled: {
      opacity: 0.65,
    },
    refreshButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    helperText: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone500,
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone500,
    },
    recipeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
    },
    recipeGridCell: {
      width: '50%',
      paddingHorizontal: 6,
      marginBottom: 12,
    },
    recipeCard: {
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.white,
    },
    recipeCover: {
      width: '100%',
      height: 112,
      backgroundColor: palette.stone100,
    },
    recipeBody: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 6,
      minHeight: 148,
      justifyContent: 'space-between',
    },
    recipeTitle: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '800',
      color: palette.stone850,
    },
    recipeMeta: {
      fontSize: 12,
      color: palette.stone500,
    },
    recipeSummary: {
      fontSize: 12,
      lineHeight: 18,
      color: palette.stone600,
    },
    recipeGhostButton: {
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.stone200,
      alignItems: 'center',
      backgroundColor: palette.surfaceWarm,
    },
    recipeGhostButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone700,
    },
    recipeDisabledButton: {
      paddingVertical: 8,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: palette.stone100,
    },
    recipeDisabledButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone500,
    },
    recipeAddButton: {
      paddingVertical: 8,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: palette.gold500,
    },
    recipeAddButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.white,
    },
  });
}
