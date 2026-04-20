import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { DEMO_RECIPE_POSTS } from '@/services/recipe-posts';
import { createRecipe, fetchRecipes } from '@/services/recipes';
import type { Recipe } from '@/types/recipe';

export default function AdminRecipesScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('潮汕');
  const [tags, setTags] = useState('');
  const [importing, setImporting] = useState(false);
  const [hintText, setHintText] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const res = await fetchRecipes(token);
      setRecipes(res.recipes || []);
    } catch (error) {
      console.error('[AdminRecipes] load failed', error);
      setHintText(error instanceof Error ? error.message : '加载食谱失败');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    if (!token || !name.trim()) {
      return;
    }
    try {
      await createRecipe(token, {
        name: name.trim(),
        cuisine: cuisine.trim(),
        tags: tags.split('、').map((item) => item.trim()).filter(Boolean),
        ingredients: [],
        steps: [],
      });
      setName('');
      setTags('');
      setHintText('食谱已保存到数据库');
      await load();
    } catch (error) {
      console.error('[AdminRecipes] create failed', error);
      setHintText(error instanceof Error ? error.message : '保存食谱失败');
    }
  };

  const handleImportDemoRecipes = async () => {
    if (!token) {
      return;
    }

    setImporting(true);
    setHintText('');
    try {
      const res = await fetchRecipes(token);
      const existingNameSet = new Set((res.recipes || []).map((item) => item.name.trim().toLowerCase()).filter(Boolean));
      const missingRecipes = DEMO_RECIPE_POSTS.filter((item) => !existingNameSet.has(item.name.trim().toLowerCase()));

      for (const recipe of missingRecipes) {
        await createRecipe(token, {
          name: recipe.name,
          cuisine: recipe.cuisine,
          tags: recipe.tags,
          suitable_for: recipe.suitableFor,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
        });
      }

      setHintText(missingRecipes.length === 0 ? '数据库已包含全部演示食谱' : `已导入 ${missingRecipes.length} 条演示食谱`);
      await load();
    } catch (error) {
      console.error('[AdminRecipes] import demo failed', error);
      setHintText(error instanceof Error ? error.message : '导入演示食谱失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>食谱库管理</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>新增食谱</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="食谱名称" />
          <TextInput style={styles.input} value={cuisine} onChangeText={setCuisine} placeholder="菜系" />
          <TextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            placeholder="标签，用“、”分隔"
          />
          <Pressable style={styles.primaryButton} onPress={handleCreate}>
            <Text style={styles.primaryButtonText}>保存食谱</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryButton, importing ? styles.secondaryButtonDisabled : undefined]}
            onPress={handleImportDemoRecipes}
            disabled={importing}
          >
            <Text style={styles.secondaryButtonText}>{importing ? '导入中...' : '导入演示食谱到数据库'}</Text>
          </Pressable>
          {hintText ? <Text style={styles.hintText}>{hintText}</Text> : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>已录入</Text>
          {recipes.length === 0 ? (
            <Text style={styles.emptyText}>暂无食谱。</Text>
          ) : (
            recipes.map((recipe) => (
              <View key={recipe.id} style={styles.recipeItem}>
                <Text style={styles.recipeName}>{recipe.name}</Text>
                <Text style={styles.recipeMeta}>
                  {recipe.cuisine || '未分类'} · {(recipe.tags || []).join('、') || '无标签'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.surface,
    },
    content: {
      padding: 20,
      gap: 16,
      flexGrow: 1,
    },
    backText: {
      color: palette.blue500,
      fontSize: 14,
      fontWeight: '600',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.stone900,
    },
    card: {
      backgroundColor: palette.white,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 10,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.stone800,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: palette.stone800,
      backgroundColor: palette.surfaceWarm,
    },
    primaryButton: {
      backgroundColor: palette.stone900,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: palette.gold50,
      fontWeight: '700',
    },
    secondaryButton: {
      backgroundColor: palette.surfaceWarm,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: palette.stone200,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryButtonDisabled: {
      opacity: 0.7,
    },
    secondaryButtonText: {
      color: palette.stone800,
      fontWeight: '700',
    },
    hintText: {
      fontSize: 13,
      color: palette.stone600,
      lineHeight: 20,
    },
    emptyText: {
      color: palette.stone500,
      fontSize: 14,
    },
    recipeItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.stone100,
    },
    recipeName: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone800,
    },
    recipeMeta: {
      fontSize: 12,
      color: palette.stone500,
    },
  });
}
