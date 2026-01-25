import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { createMeal, fetchMealsByDate } from '@/services/meals';
import type { Meal, MealItem } from '@/types/meal';

export default function RecordScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealType, setMealType] = useState('breakfast');
  const [foodName, setFoodName] = useState('');
  const [weight, setWeight] = useState('');
  const [items, setItems] = useState<MealItem[]>([]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const loadMeals = async () => {
    if (!token) {
      return;
    }
    try {
      const res = await fetchMealsByDate(todayKey, token);
      setMeals(res.meals || []);
    } catch (error) {
      console.error('[Meals] load failed', error);
    }
  };

  useEffect(() => {
    void loadMeals();
  }, [token]);

  const handleAddItem = () => {
    if (!foodName.trim()) {
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        food_name: foodName.trim(),
        weight_g: weight ? Number(weight) : undefined,
        source: 'manual',
      },
    ]);
    setFoodName('');
    setWeight('');
  };

  const handleSubmit = async () => {
    if (!token || items.length === 0) {
      return;
    }
    try {
      await createMeal(
        {
          meal_type: mealType,
          eaten_at: new Date().toISOString(),
          items,
        },
        token
      );
      setItems([]);
      await loadMeals();
    } catch (error) {
      console.error('[Meals] create failed', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>饮食记录</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>新增餐次</Text>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>餐次</Text>
            <TextInput
              style={styles.formInput}
              value={mealType}
              onChangeText={setMealType}
              placeholder="breakfast/lunch/dinner/snack"
              placeholderTextColor={palette.stone400}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>食物</Text>
            <TextInput
              style={styles.formInput}
              value={foodName}
              onChangeText={setFoodName}
              placeholder="例如：清蒸鱼"
              placeholderTextColor={palette.stone400}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>重量(g)</Text>
            <TextInput
              style={styles.formInput}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="可选"
              placeholderTextColor={palette.stone400}
            />
          </View>
          <Pressable style={styles.secondaryButton} onPress={handleAddItem}>
            <Text style={styles.secondaryButtonText}>添加食物</Text>
          </Pressable>

          {items.length > 0 && (
            <View style={styles.itemList}>
              {items.map((item, index) => (
                <Text key={`${item.food_name}-${index}`} style={styles.itemText}>
                  {item.food_name} {item.weight_g ? `${item.weight_g}g` : ''}
                </Text>
              ))}
            </View>
          )}

          <Pressable style={styles.primaryButton} onPress={handleSubmit}>
            <Text style={styles.primaryButtonText}>保存餐次</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>今日记录</Text>
          {meals.length === 0 ? (
            <Text style={styles.emptyText}>今天还没有记录，先添加一餐吧。</Text>
          ) : (
            meals.map((meal) => (
              <View key={meal.id} style={styles.mealItem}>
                <Text style={styles.mealTitle}>{meal.meal_type}</Text>
                {(meal.items || []).map((item) => (
                  <Text key={`${meal.id}-${item.food_name}`} style={styles.mealText}>
                    · {item.food_name} {item.weight_g ? `${item.weight_g}g` : ''}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <BottomDock
        activeTab="record"
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
    card: {
      backgroundColor: palette.white,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.stone800,
    },
    formRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    formLabel: {
      width: 70,
      fontSize: 14,
      color: palette.stone600,
    },
    formInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: palette.stone800,
      backgroundColor: palette.surfaceWarm,
    },
    secondaryButton: {
      backgroundColor: palette.surfaceWarm,
      borderRadius: 16,
      paddingVertical: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.stone100,
    },
    secondaryButtonText: {
      color: palette.stone700,
      fontWeight: '600',
    },
    itemList: {
      gap: 6,
    },
    itemText: {
      fontSize: 14,
      color: palette.stone700,
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
    emptyText: {
      fontSize: 14,
      color: palette.stone500,
    },
    mealItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.stone100,
    },
    mealTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone800,
    },
    mealText: {
      fontSize: 13,
      color: palette.stone600,
      marginTop: 4,
    },
  });
}
