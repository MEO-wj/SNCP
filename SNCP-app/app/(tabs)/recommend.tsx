import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowsClockwise, Plus, Sparkle } from 'phosphor-react-native';

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
  DEMO_RECIPE_POSTS,
  filterDemoRecipePosts,
  getRecipeCover,
  hasRecipeCover,
  mapLibraryRecipesToPosts,
  type RecipePost,
} from '@/services/recipe-posts';
import { createRecipe, fetchRecipes } from '@/services/recipes';

type LoadOptions = {
  excludeNames?: string[];
  refreshRound?: number;
};

function getProviderLabel(provider: string): string {
  switch (provider) {
    case 'zhipu':
      return '智谱 AI';
    case 'rules':
      return '本地规则';
    case 'remote':
      return '外部服务';
    case 'openai':
      return 'OpenAI';
    default:
      return provider;
  }
}

function getRecipeMetaText(recipe: RecipePost): string {
  const prefix =
    recipe.source === 'external' ? '外部食谱' : recipe.source === 'library' ? '食谱库' : 'AI 推荐';
  const tagText = recipe.tags.slice(0, 2).join('、');
  return `${prefix} · ${tagText || recipe.cuisine}`;
}

export default function RecommendScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [keyword, setKeyword] = useState('');
  const [recipePosts, setRecipePosts] = useState<RecipePost[]>(DEMO_RECIPE_POSTS);
  const [recommendationPosts, setRecommendationPosts] = useState<RecipePost[]>([]);
  const [usingDemoData, setUsingDemoData] = useState(true);
  const [provider, setProvider] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [refreshRound, setRefreshRound] = useState(0);

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

      setLoading(true);
      setErrorText('');

      try {
        const [libraryResult, aiResult] = await Promise.allSettled([
          fetchRecipes(token, nextKeyword || undefined),
          recommendRecipes(token, {
            keyword: nextKeyword || undefined,
            exclude_names: options?.excludeNames?.length ? options.excludeNames : undefined,
            refresh_round: options?.refreshRound ?? 0,
          }),
        ]);

        let nextErrorText = '';
        let nextUsingDemoData = true;
        let basePosts = filterDemoRecipePosts(nextKeyword);

        if (libraryResult.status === 'fulfilled') {
          const libraryPosts = mapLibraryRecipesToPosts(libraryResult.value.recipes || []);
          if (libraryPosts.length > 0) {
            basePosts = libraryPosts;
            nextUsingDemoData = false;
          }
        } else {
          console.warn('[Recommend] library load failed', libraryResult.reason);
          nextErrorText =
            libraryResult.reason instanceof Error
              ? libraryResult.reason.message
              : '食谱库加载失败，当前展示预置食谱。';
        }

        let nextRecommendationPosts: RecipePost[] = [];
        let nextProvider = '';
        let nextMessage = '';

        if (aiResult.status === 'fulfilled') {
          nextRecommendationPosts = buildRecommendationPosts(aiResult.value.items || [], basePosts);
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
        setUsingDemoData(nextUsingDemoData);
        setProvider(nextProvider);
        setMessage(nextMessage);
        setErrorText(nextErrorText);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    void load('', { refreshRound: 0 });
  }, [load, token]);

  const handleSearch = useCallback(() => {
    setRefreshRound(0);
    void load(keyword, { refreshRound: 0 });
  }, [keyword, load]);

  const handleRefreshRecommendations = useCallback(() => {
    const nextRound = refreshRound + 1;
    setRefreshRound(nextRound);
    void load(keyword, {
      excludeNames: recommendationPosts.map((item) => item.name),
      refreshRound: nextRound,
    });
  }, [keyword, load, recommendationPosts, refreshRound]);

  const handleAddRecipe = useCallback(
    async (recipe: RecipePost) => {
      const canAdd = recipe.source === 'ai' || recipe.source === 'external';
      if (!token || !canAdd) {
        return;
      }

      setSavingRecipeId(recipe.id);
      setErrorText('');

      try {
        await createRecipe(token, {
          name: recipe.name,
          cuisine: recipe.cuisine,
          tags: recipe.tags,
          suitable_for: recipe.suitableFor,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          cover_url: recipe.coverUrl,
          source_url: recipe.sourceUrl,
          source_provider: recipe.sourceProvider,
        });
        setRefreshRound(0);
        await load(keyword, { refreshRound: 0 });
      } catch (error) {
        console.error('[Recommend] add recipe failed', error);
        setErrorText(error instanceof Error ? error.message : '加入食谱库失败');
      } finally {
        setSavingRecipeId(null);
      }
    },
    [keyword, load, token],
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
          <Text style={styles.title}>根据档案与饮食记录给出建议</Text>
          <Text style={styles.heroText}>
            AI 会先参考你的食谱库，也会补充外部真实食谱。命中已有食谱时直接复用，命中新菜时可以一键加入到自己的食谱库。
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
            <Text style={styles.emptyText}>当前还没有生成推荐，可以先完善健康档案或录入几餐饮食数据。</Text>
          ) : (
            <View style={styles.recipeGrid}>
              {recommendationPosts.map((recipe) => {
                const isAdded = recipe.source === 'library' || recipe.source === 'demo';
                const isSaving = savingRecipeId === recipe.id;

                return (
                  <View key={recipe.id} style={styles.recipeGridCell}>
                    <View style={styles.recipeCard}>
                      <Pressable onPress={() => handleOpenRecipe(recipe)}>
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

                      <Pressable
                        style={[styles.actionButton, isAdded && styles.actionButtonAdded]}
                        onPress={() => void handleAddRecipe(recipe)}
                        disabled={isAdded || isSaving}
                      >
                        {isSaving ? (
                          <ActivityIndicator size="small" color={palette.orange500} />
                        ) : (
                          <>
                            {!isAdded ? <Plus size={14} color={palette.orange500} weight="bold" /> : null}
                            <Text style={[styles.actionButtonText, isAdded && styles.actionButtonTextAdded]}>
                              {isAdded ? '已加入食谱库' : '加入食谱库'}
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>食谱库</Text>
            {usingDemoData ? (
              <View style={styles.providerChip}>
                <Text style={styles.providerChipText}>预置食谱</Text>
              </View>
            ) : null}
          </View>

          {usingDemoData ? (
            <Text style={styles.helperText}>当前展示预置食谱，便于预览卡片流与详情效果。</Text>
          ) : null}

          {recipePosts.length === 0 ? (
            <Text style={styles.emptyText}>
              {usingDemoData ? '预置食谱也没有命中，试试换个关键词。' : '你的食谱库里暂时没有匹配项。'}
            </Text>
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
                        {recipe.cuisine} · {recipe.tags.slice(0, 2).join('、') || '健康餐'}
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
        onHome={() => router.replace('/(tabs)')}
        onRecord={() => router.replace('/(tabs)/record')}
        onRecommend={() => router.replace('/(tabs)/recommend')}
        onTrend={() => router.replace('/(tabs)/trend')}
        onProfile={() => router.replace('/(tabs)/settings')}
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
    actionButton: {
      minHeight: 42,
      borderTopWidth: 1,
      borderTopColor: palette.stone100,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: palette.gold50,
    },
    actionButtonAdded: {
      backgroundColor: palette.surfaceWarm,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.orange500,
    },
    actionButtonTextAdded: {
      color: palette.stone600,
    },
  });
}
