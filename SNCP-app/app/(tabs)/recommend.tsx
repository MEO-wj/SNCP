import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { fetchRecipes } from '@/services/recipes';
import type { Recipe } from '@/types/recipe';

export default function RecommendScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [keyword, setKeyword] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const load = async () => {
    if (!token) {
      return;
    }
    try {
      const res = await fetchRecipes(token, keyword);
      setRecipes(res.recipes || []);
    } catch (error) {
      console.error('[Recipes] load failed', error);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>推荐食谱</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={keyword}
            onChangeText={setKeyword}
            placeholder="搜索食谱"
            placeholderTextColor={palette.stone400}
          />
          <Pressable style={styles.searchButton} onPress={load}>
            <Text style={styles.searchButtonText}>搜索</Text>
          </Pressable>
        </View>

        {recipes.length === 0 ? (
          <Text style={styles.emptyText}>暂无食谱，请稍后再试。</Text>
        ) : (
          recipes.map((recipe) => (
            <View key={recipe.id} style={styles.card}>
              <Text style={styles.cardTitle}>{recipe.name}</Text>
              <Text style={styles.cardMeta}>
                {recipe.cuisine || '家常'} · {(recipe.tags || []).join('、') || '均衡'}
              </Text>
              <Text style={styles.cardHint}>适宜人群：{(recipe.suitable_for || []).join('、') || '通用'}</Text>
            </View>
          ))
        )}
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
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: palette.stone900,
    },
    searchRow: {
      flexDirection: 'row',
      gap: 10,
    },
    searchInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: palette.white,
      color: palette.stone800,
    },
    searchButton: {
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: palette.gold500,
      justifyContent: 'center',
    },
    searchButtonText: {
      color: palette.white,
      fontWeight: '700',
    },
    emptyText: {
      fontSize: 14,
      color: palette.stone500,
    },
    card: {
      backgroundColor: palette.white,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 6,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.stone800,
    },
    cardMeta: {
      fontSize: 13,
      color: palette.stone500,
    },
    cardHint: {
      fontSize: 13,
      color: palette.stone600,
    },
  });
}
