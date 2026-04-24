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
import { recommendRecipes } from '@/services/ai';
import {
  buildRecommendationPosts,
  cacheRecipePosts,
  getRecipeCover,
  hasRecipeCover,
  mapLibraryRecipesToPosts,
  type RecipePost,
} from '@/services/recipe-posts';
import { fetchRecipes } from '@/services/recipes';
import {
  readRecommendExperienceCache,
  writeRecommendExperienceCache,
  type RecommendExperienceCache,
} from '@/services/nutrition-cache';
import { subscribeNutritionRefresh } from '@/services/nutrition-refresh';

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
      return '远端服务';
    case 'openai':
      return 'OpenAI';
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

export default function RecommendScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [keyword, setKeyword] = useState('');
  const [recipePosts, setRecipePosts] = useState<RecipePost[]>([]);
  const [recommendationPosts, setRecommendationPosts] = useState<RecipePost[]>([]);
  const [provider, setProvider] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [refreshRound, setRefreshRound] = useState(0);

  const applyCachedState = useCallback((cached: RecommendExperienceCache | null) => {
    if (!cached) {
      return false;
    }

    const cachedRecipes = keepLibraryPosts(cached.recipePosts);
    const cachedRecommendations = keepLibraryPosts(cached.recommendationPosts);
    cacheRecipePosts([...cachedRecipes, ...cachedRecommendations]);
    setRecipePosts(cachedRecipes);
    setRecommendationPosts(cachedRecommendations);
    setProvider(cached.provider);
    setMessage(cached.message);
    return cachedRecipes.length > 0 || cachedRecommendations.length > 0;
  }, []);

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
        let basePosts: RecipePost[] = [];

        const aiResult = await recommendRecipes(token, {
          keyword: nextKeyword || undefined,
          exclude_names: options?.excludeNames?.length ? options.excludeNames : undefined,
          refresh_round: options?.refreshRound ?? 0,
        })
          .then((value) => ({ status: 'fulfilled' as const, value }))
          .catch((reason) => ({ status: 'rejected' as const, reason }));

        const libraryResult =
          aiResult.status === 'fulfilled' && aiResult.value.recipes
            ? {
                status: 'fulfilled' as const,
                value: { recipes: aiResult.value.recipes },
              }
            : await fetchRecipes(token, nextKeyword || undefined)
                .then((value) => ({ status: 'fulfilled' as const, value }))
                .catch((reason) => ({ status: 'rejected' as const, reason }));

        if (libraryResult.status === 'fulfilled') {
          basePosts = keepLibraryPosts(mapLibraryRecipesToPosts(libraryResult.value.recipes || []));
        } else {
          console.warn('[Recommend] library load failed', libraryResult.reason);
          nextErrorText =
            libraryResult.reason instanceof Error
              ? libraryResult.reason.message
              : '食谱库加载失败，请稍后重试。';
        }

        let nextRecommendationPosts: RecipePost[] = [];
        let nextProvider = '';
        let nextMessage = '';

        if (aiResult.status === 'fulfilled') {
          nextRecommendationPosts = keepLibraryPosts(
            buildRecommendationPosts(aiResult.value.items || [], basePosts),
          );
          nextProvider = aiResult.value.provider || '';
          nextMessage = aiResult.value.message || '';
        } else {
          console.warn('[Recommend] ai load failed', aiResult.reason);
          const aiErrorText =
            aiResult.reason instanceof Error ? aiResult.reason.message : 'AI 推荐加载失败';
          nextErrorText = nextErrorText ? `${nextErrorText} ${aiErrorText}` : aiErrorText;
        }

        cacheRecipePosts([...basePosts, ...nextRecommendationPosts]);
        setRecipePosts(basePosts);
        setRecommendationPosts(nextRecommendationPosts);
        setProvider(nextProvider);
        setMessage(nextMessage);
        await writeRecommendExperienceCache(nextKeyword, {
          recipePosts: basePosts,
          recommendationPosts: nextRecommendationPosts,
          usingDemoData: false,
          provider: nextProvider,
          message: nextMessage,
        });

        if (!options?.silent || nextErrorText) {
          setErrorText(nextErrorText);
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [token],
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
        if (isFreshRecommendCache(cached)) {
          return;
        }
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
    void (async () => {
      const cached = await readRecommendExperienceCache(keyword);
      const hasCache = applyCachedState(cached);
      if (hasCache && isFreshRecommendCache(cached)) {
        return;
      }
      void load(keyword, { refreshRound: 0, silent: hasCache });
    })();
  }, [applyCachedState, keyword, load]);

  const handleRefreshRecommendations = useCallback(() => {
    const nextRound = refreshRound + 1;
    setRefreshRound(nextRound);
    void load(keyword, {
      excludeNames: recommendationPosts.map((item) => item.name),
      refreshRound: nextRound,
    });
  }, [keyword, load, recommendationPosts, refreshRound]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Sparkle size={14} color={palette.orange500} weight="fill" />
            <Text style={styles.heroBadgeText}>智能推荐</Text>
          </View>
          <Text style={styles.title}>从服务器食谱库里挑合适的菜</Text>
          <Text style={styles.heroText}>
            AI 只会在当前服务器已有的食谱库中筛选和排序，不再拉取外部食谱，也不会把推荐结果写入食谱库。
          </Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={keyword}
            onChangeText={setKeyword}
            placeholder="输入关键词，比如 高蛋白、早餐、低盐"
            placeholderTextColor={palette.stone400}
          />
          <Pressable style={styles.searchButton} onPress={handleSearch} disabled={loading}>
            <Text style={styles.searchButtonText}>{loading ? '加载中' : '搜索'}</Text>
          </Pressable>
        </View>

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
            <Text style={styles.emptyText}>
              当前没有匹配的推荐。可以换个关键词，或先在服务器食谱库里补充更多基础食谱。
            </Text>
          ) : (
            <View style={styles.recipeGrid}>
              {recommendationPosts.map((recipe) => (
                <View key={recipe.id} style={styles.recipeGridCell}>
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
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>食谱库</Text>
            <View style={styles.providerChip}>
              <Text style={styles.providerChipText}>服务器已有</Text>
            </View>
          </View>

          {recipePosts.length === 0 ? (
            <Text style={styles.emptyText}>服务器食谱库里暂时没有匹配项。</Text>
          ) : (
            <View style={styles.recipeGrid}>
              {recipePosts.map((recipe) => (
                <View key={recipe.id} style={styles.recipeGridCell}>
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
                    </View>
                  </Pressable>
                </View>
              ))}
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
      minHeight: 104,
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
  });
}
