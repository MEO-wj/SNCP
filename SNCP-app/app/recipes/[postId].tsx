import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Link as LinkIcon } from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { RecipeCoverPlaceholder } from '@/components/recipe-cover-placeholder';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import {
  getCachedRecipePostById,
  getDemoRecipeById,
  getRecipeCover,
  hasRecipeCover,
  mapLibraryRecipesToPosts,
  type RecipePost,
} from '@/services/recipe-posts';
import { fetchRecipes } from '@/services/recipes';

function getSourceLabel(recipePost: RecipePost | null): string {
  if (!recipePost) {
    return '';
  }
  if (recipePost.source === 'demo') {
    return '预置食谱';
  }
  if (recipePost.source === 'external') {
    return '外部食谱';
  }
  if (recipePost.source === 'ai') {
    return 'AI 推荐';
  }
  return '我的食谱库';
}

export default function RecipeDetailScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const params = useLocalSearchParams<{ postId?: string }>();
  const postId = typeof params.postId === 'string' ? params.postId : '';

  const [recipePost, setRecipePost] = useState<RecipePost | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const loadRecipe = useCallback(async () => {
    if (!postId) {
      setRecipePost(null);
      setErrorText('未获取到食谱信息，请返回重试。');
      return;
    }

    const cachedRecipe = getCachedRecipePostById(postId);
    if (cachedRecipe) {
      setRecipePost(cachedRecipe);
      setErrorText('');
      return;
    }

    const demoRecipe = getDemoRecipeById(postId);
    if (demoRecipe) {
      setRecipePost(demoRecipe);
      setErrorText('');
      return;
    }

    if (!token) {
      setRecipePost(null);
      setErrorText('登录状态失效，请返回重新登录。');
      return;
    }

    setLoading(true);
    setErrorText('');

    try {
      const library = await fetchRecipes(token);
      const recipe = mapLibraryRecipesToPosts(library.recipes || []).find((item) => item.id === postId) || null;

      if (!recipe) {
        setRecipePost(null);
        setErrorText('该食谱已不存在或暂时不可用。');
        return;
      }

      setRecipePost(recipe);
    } catch (error) {
      console.error('[RecipeDetail] load failed', error);
      setRecipePost(null);
      setErrorText(error instanceof Error ? error.message : '加载食谱详情失败');
    } finally {
      setLoading(false);
    }
  }, [postId, token]);

  useEffect(() => {
    void loadRecipe();
  }, [loadRecipe]);

  const handleOpenSource = useCallback(async () => {
    if (!recipePost?.sourceUrl) {
      return;
    }
    try {
      await Linking.openURL(recipePost.sourceUrl);
    } catch (error) {
      console.error('[RecipeDetail] open source failed', error);
      setErrorText('来源链接暂时无法打开。');
    }
  }, [recipePost]);

  const sourceLabel = getSourceLabel(recipePost);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={18} color={palette.stone800} />
          <Text style={styles.backText}>返回</Text>
        </Pressable>

        {loading ? <Text style={styles.helperText}>正在加载食谱详情...</Text> : null}
        {!loading && errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

        {recipePost ? (
          <>
            <View style={styles.coverCard}>
              {hasRecipeCover(recipePost) ? (
                <Image source={getRecipeCover(recipePost)} style={styles.coverImage} contentFit="cover" />
              ) : (
                <RecipeCoverPlaceholder title={recipePost.name} />
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>{recipePost.name}</Text>
              <Text style={styles.metaText}>
                {recipePost.cuisine} · {sourceLabel}
              </Text>
              <Text style={styles.summaryText}>{recipePost.summary}</Text>

              <View style={styles.tagRow}>
                {recipePost.tags.map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagPillText}>{tag}</Text>
                  </View>
                ))}
              </View>

              {recipePost.suitableFor.length > 0 ? (
                <Text style={styles.helperText}>适宜人群：{recipePost.suitableFor.join('、')}</Text>
              ) : null}

              {recipePost.sourceUrl ? (
                <Pressable style={styles.sourceButton} onPress={() => void handleOpenSource()}>
                  <LinkIcon size={16} color={palette.orange500} weight="bold" />
                  <View style={styles.sourceTextWrap}>
                    <Text style={styles.sourceTitle}>
                      来源链接{recipePost.sourceProvider ? ` · ${recipePost.sourceProvider}` : ''}
                    </Text>
                    <Text style={styles.sourceText} numberOfLines={2}>
                      {recipePost.sourceUrl}
                    </Text>
                  </View>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>食材清单</Text>
              {recipePost.ingredients.length === 0 ? (
                <Text style={styles.helperText}>当前推荐暂未提供具体食材，可按推荐说明灵活搭配。</Text>
              ) : (
                recipePost.ingredients.map((ingredient) => (
                  <View key={`${ingredient.name}-${ingredient.amount || ''}`} style={styles.listRow}>
                    <Text style={styles.listDot}>•</Text>
                    <Text style={styles.listText}>
                      {ingredient.name}
                      {ingredient.amount ? ` ${ingredient.amount}` : ''}
                    </Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>制作步骤</Text>
              {recipePost.steps.length === 0 ? (
                <Text style={styles.helperText}>当前推荐暂未提供步骤说明。</Text>
              ) : (
                recipePost.steps.map((step, index) => (
                  <View key={`${step}-${index}`} style={styles.stepRow}>
                    <View style={styles.stepIndex}>
                      <Text style={styles.stepIndexText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
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
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 40,
      gap: 14,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 4,
    },
    backText: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone800,
    },
    coverCard: {
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.white,
    },
    coverImage: {
      width: '100%',
      height: 220,
      backgroundColor: palette.stone100,
    },
    card: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.white,
      padding: 16,
      gap: 10,
    },
    title: {
      fontSize: 24,
      lineHeight: 32,
      fontWeight: '800',
      color: palette.stone900,
    },
    metaText: {
      fontSize: 13,
      color: palette.stone500,
    },
    summaryText: {
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone700,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    helperText: {
      fontSize: 13,
      lineHeight: 21,
      color: palette.stone600,
    },
    errorText: {
      fontSize: 14,
      color: palette.imperial500,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tagPill: {
      borderRadius: 999,
      backgroundColor: palette.gold50,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    tagPillText: {
      fontSize: 12,
      color: palette.orange500,
      fontWeight: '700',
    },
    sourceButton: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
      padding: 12,
    },
    sourceTextWrap: {
      flex: 1,
      gap: 4,
    },
    sourceTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.orange500,
    },
    sourceText: {
      fontSize: 12,
      lineHeight: 18,
      color: palette.stone600,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    listDot: {
      color: palette.orange500,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: '700',
      marginTop: 1,
    },
    listText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone700,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    stepIndex: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: palette.gold100,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    stepIndexText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.orange500,
    },
    stepText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone700,
    },
  });
}
