import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AppleLogo,
  CaretRight,
  Clock,
  Coffee,
  Cookie,
  Drop,
  Egg,
  Fire,
  Fish,
  ForkKnife,
  Leaf,
  MoonStars,
  Sparkle,
  SunHorizon,
  XCircle,
} from 'phosphor-react-native';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import {
  FOOD_CATALOG,
  FOOD_CATEGORIES,
  FOOD_WEIGHT_OPTIONS,
  type FoodCategory,
  type FoodIconKey,
} from '@/constants/food-catalog';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';
import { createMeal, fetchMealsByDate } from '@/services/meals';
import type { Meal, MealItem } from '@/types/meal';
import type { NutritionValues } from '@/types/nutrition';
import { formatTimeLabel } from '@/utils/date';
import {
  EMPTY_NUTRITION,
  formatNutritionValue,
  scaleNutrition,
  sumMealItemsNutrition,
  sumMealsNutrition,
  sumNutritionValues,
} from '@/utils/nutrition';

type IconComponent = React.ComponentType<any>;

type MealOption = {
  value: string;
  label: string;
  caption: string;
  icon: IconComponent;
  tint: string;
  surfaceTintLight: string;
  surfaceTintDark: string;
};

const MEAL_OPTIONS: MealOption[] = [
  {
    value: 'breakfast',
    label: '早餐',
    caption: '晨间补能',
    icon: SunHorizon,
    tint: '#E38B2F',
    surfaceTintLight: 'rgba(255, 209, 102, 0.20)',
    surfaceTintDark: 'rgba(255, 209, 102, 0.14)',
  },
  {
    value: 'lunch',
    label: '午餐',
    caption: '主力进食',
    icon: ForkKnife,
    tint: '#D76A4A',
    surfaceTintLight: 'rgba(243, 106, 139, 0.12)',
    surfaceTintDark: 'rgba(243, 106, 139, 0.10)',
  },
  {
    value: 'dinner',
    label: '晚餐',
    caption: '轻盈收口',
    icon: MoonStars,
    tint: '#7A66D9',
    surfaceTintLight: 'rgba(106, 142, 174, 0.16)',
    surfaceTintDark: 'rgba(122, 102, 217, 0.14)',
  },
  {
    value: 'snack',
    label: '加餐',
    caption: '两餐之间',
    icon: Coffee,
    tint: '#4E8C63',
    surfaceTintLight: 'rgba(76, 175, 80, 0.16)',
    surfaceTintDark: 'rgba(76, 175, 80, 0.12)',
  },
];

const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = FOOD_CATEGORIES.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {} as Record<FoodCategory, string>,
);

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMealOption(value: string) {
  return MEAL_OPTIONS.find((item) => item.value === value) ?? MEAL_OPTIONS[0];
}

function renderFoodIcon(icon: FoodIconKey, color: string, size = 18) {
  switch (icon) {
    case 'fish':
      return <Fish size={size} color={color} weight="duotone" />;
    case 'egg':
      return <Egg size={size} color={color} weight="duotone" />;
    case 'leaf':
      return <Leaf size={size} color={color} weight="duotone" />;
    case 'fruit':
      return <AppleLogo size={size} color={color} weight="duotone" />;
    case 'drop':
      return <Drop size={size} color={color} weight="duotone" />;
    case 'cookie':
      return <Cookie size={size} color={color} weight="duotone" />;
    case 'meat':
      return <Fire size={size} color={color} weight="duotone" />;
    case 'grain':
    default:
      return <CaretRight size={size} color={color} weight="bold" />;
  }
}

function NutritionMetric({
  label,
  value,
  unit,
  styles,
  subtle = false,
}: {
  label: string;
  value: number;
  unit: string;
  styles: ReturnType<typeof createStyles>;
  subtle?: boolean;
}) {
  return (
    <View style={[styles.metricCard, subtle && styles.metricCardSubtle]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {formatNutritionValue(value)}
        <Text style={styles.metricUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

function MacroChip({
  label,
  value,
  styles,
}: {
  label: string;
  value: number;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.macroChip}>
      <Text style={styles.macroChipLabel}>{label}</Text>
      <Text style={styles.macroChipValue}>{formatNutritionValue(value)}g</Text>
    </View>
  );
}

export default function RecordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette, isDark), [isDark, palette]);

  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealType, setMealType] = useState('breakfast');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory>('staple');
  const [selectedFoodId, setSelectedFoodId] = useState<string>(FOOD_CATALOG[0]?.id ?? '');
  const [selectedWeight, setSelectedWeight] = useState<number>(100);
  const [items, setItems] = useState<MealItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  const todayKey = useMemo(() => getTodayKey(), []);

  const visibleFoods = useMemo(
    () => FOOD_CATALOG.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );

  useEffect(() => {
    if (visibleFoods.length === 0) {
      setSelectedFoodId('');
      return;
    }
    if (!visibleFoods.some((item) => item.id === selectedFoodId)) {
      setSelectedFoodId(visibleFoods[0].id);
    }
  }, [selectedFoodId, visibleFoods]);

  const selectedFood = useMemo(
    () => visibleFoods.find((item) => item.id === selectedFoodId) ?? visibleFoods[0] ?? null,
    [selectedFoodId, visibleFoods],
  );

  const loadMeals = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const res = await fetchMealsByDate(todayKey, token);
      setMeals(res.meals || []);
    } catch (error) {
      console.error('[Meals] load failed', error);
    }
  }, [todayKey, token]);

  useEffect(() => {
    void loadMeals();
  }, [loadMeals]);

  const selectedPortionNutrition = useMemo<NutritionValues>(() => {
    if (!selectedFood) {
      return EMPTY_NUTRITION;
    }
    return scaleNutrition(selectedFood.nutritionPer100g, selectedWeight);
  }, [selectedFood, selectedWeight]);

  const draftTotals = useMemo(() => sumMealItemsNutrition(items), [items]);
  const todayTotals = useMemo(() => sumMealsNutrition(meals), [meals]);
  const projectedTotals = useMemo(
    () => sumNutritionValues(todayTotals, draftTotals),
    [draftTotals, todayTotals],
  );

  const handleAddItem = () => {
    if (!selectedFood) {
      return;
    }
    setErrorText('');
    setItems((prev) => [
      ...prev,
      {
        food_name: selectedFood.name,
        food_category: FOOD_CATEGORY_LABELS[selectedFood.category],
        weight_g: selectedWeight,
        source: 'catalog',
        nutrition: selectedFood.nutritionPer100g,
      },
    ]);
  };

  const handleRemoveDraftItem = (index: number) => {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSubmit = async () => {
    if (!token || items.length === 0 || saving) {
      return;
    }
    setSaving(true);
    setErrorText('');
    try {
      await createMeal(
        {
          meal_type: mealType,
          eaten_at: new Date().toISOString(),
          items,
        },
        token,
      );
      setItems([]);
      await loadMeals();
    } catch (error) {
      console.error('[Meals] create failed', error);
      setErrorText(error instanceof Error ? error.message : '保存餐次失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>饮食记录</Text>

        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroEyebrow}>今日累计</Text>
              <Text style={styles.heroTitle}>录一餐，首页和趋势页就会同步更新</Text>
            </View>
            <View style={styles.heroBadge}>
              <Sparkle size={14} color={palette.orange500} weight="fill" />
              <Text style={styles.heroBadgeText}>{meals.length} 餐已记录</Text>
            </View>
          </View>

          <View style={styles.metricGrid}>
            <NutritionMetric label="热量" value={todayTotals.calories} unit="kcal" styles={styles} />
            <NutritionMetric label="蛋白" value={todayTotals.protein} unit="g" styles={styles} />
            <NutritionMetric label="脂肪" value={todayTotals.fat} unit="g" styles={styles} />
            <NutritionMetric label="碳水" value={todayTotals.carbs} unit="g" styles={styles} />
          </View>

          {items.length > 0 ? (
            <View style={styles.projectionStrip}>
              <Text style={styles.projectionLabel}>保存本餐后预计</Text>
              <Text style={styles.projectionValue}>
                {Math.round(projectedTotals.calories)} kcal · 蛋白 {formatNutritionValue(projectedTotals.protein)}g · 碳水{' '}
                {formatNutritionValue(projectedTotals.carbs)}g
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>选择录入</Text>
          <Text style={styles.cardHint}>不再手动输入食物名和克重，直接从食物库选择并自动带出平均营养值。</Text>

          <Text style={styles.sectionLabel}>1. 选择餐次</Text>
          <View style={styles.mealTypeRow}>
            {MEAL_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = mealType === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.mealTypeCard,
                    active && {
                      borderColor: option.tint,
                      backgroundColor: isDark ? option.surfaceTintDark : option.surfaceTintLight,
                    },
                  ]}
                  onPress={() => setMealType(option.value)}
                >
                  <View style={[styles.mealTypeIconWrap, active && { backgroundColor: option.tint }]}>
                    <Icon size={18} color={active ? (isDark ? palette.surface : palette.white) : option.tint} weight="fill" />
                  </View>
                  <Text style={styles.mealTypeTitle}>{option.label}</Text>
                  <Text style={styles.mealTypeCaption}>{option.caption}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>2. 选择食物分类</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {FOOD_CATEGORIES.map((category) => {
              const active = selectedCategory === category.value;
              return (
                <Pressable
                  key={category.value}
                  style={[styles.categoryChip, active && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(category.value)}
                >
                  <Text style={[styles.categoryChipLabel, active && styles.categoryChipLabelActive]}>
                    {category.label}
                  </Text>
                  <Text style={[styles.categoryChipHint, active && styles.categoryChipHintActive]}>
                    {category.hint}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionLabel}>3. 选择食物</Text>
          <View style={styles.foodGrid}>
            {visibleFoods.map((food) => {
              const active = selectedFood?.id === food.id;
              return (
                <Pressable
                  key={food.id}
                  style={[styles.foodCard, active && styles.foodCardActive]}
                  onPress={() => setSelectedFoodId(food.id)}
                >
                  <View style={[styles.foodIconWrap, active && styles.foodIconWrapActive]}>
                    {renderFoodIcon(food.icon, active ? (isDark ? palette.surface : palette.white) : palette.orange500, 18)}
                  </View>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodHint}>{food.portionHint}</Text>
                  <Text style={styles.foodMacro}>蛋白 {formatNutritionValue(food.nutritionPer100g.protein)}g / 100g</Text>
                </Pressable>
              );
            })}
          </View>

          {selectedFood ? (
            <View style={styles.selectionPreview}>
              <View style={styles.selectionPreviewHeader}>
                <View>
                  <Text style={styles.selectionPreviewTitle}>{selectedFood.name}</Text>
                  <Text style={styles.selectionPreviewHint}>{selectedFood.portionHint}</Text>
                </View>
                <View style={styles.selectionPreviewBadge}>
                  <Text style={styles.selectionPreviewBadgeText}>{selectedWeight}g</Text>
                </View>
              </View>
              <View style={styles.metricGrid}>
                <NutritionMetric label="热量" value={selectedPortionNutrition.calories} unit="kcal" styles={styles} subtle />
                <NutritionMetric label="蛋白" value={selectedPortionNutrition.protein} unit="g" styles={styles} subtle />
                <NutritionMetric label="脂肪" value={selectedPortionNutrition.fat} unit="g" styles={styles} subtle />
                <NutritionMetric label="碳水" value={selectedPortionNutrition.carbs} unit="g" styles={styles} subtle />
              </View>
            </View>
          ) : null}

          <Text style={styles.sectionLabel}>4. 选择重量</Text>
          <View style={styles.weightRow}>
            {FOOD_WEIGHT_OPTIONS.map((weight) => {
              const active = selectedWeight === weight;
              return (
                <Pressable
                  key={weight}
                  style={[styles.weightChip, active && styles.weightChipActive]}
                  onPress={() => setSelectedWeight(weight)}
                >
                  <Text style={[styles.weightChipText, active && styles.weightChipTextActive]}>{weight}g</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.addButton} onPress={handleAddItem}>
            <Text style={styles.addButtonText}>加入本餐</Text>
          </Pressable>

          <View style={styles.draftCard}>
            <View style={styles.draftHeader}>
              <View>
                <Text style={styles.draftTitle}>本餐草稿</Text>
                <Text style={styles.draftHint}>先把食物加入当前餐次，再统一保存。</Text>
              </View>
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeText}>{items.length} 项</Text>
              </View>
            </View>

            {items.length === 0 ? (
              <Text style={styles.emptyText}>还没有加入食物，先在上面点选一个菜品和克重。</Text>
            ) : (
              <View style={styles.draftList}>
                {items.map((item, index) => {
                  const actualNutrition = scaleNutrition(item.nutrition, item.weight_g);
                  return (
                    <View key={`${item.food_name}-${index}`} style={styles.draftItemRow}>
                      <View style={styles.draftItemMain}>
                        <Text style={styles.draftItemTitle}>
                          {item.food_name} · {item.weight_g || 0}g
                        </Text>
                        <Text style={styles.draftItemMeta}>
                          蛋白 {formatNutritionValue(actualNutrition.protein)}g · 脂肪 {formatNutritionValue(actualNutrition.fat)}g · 碳水{' '}
                          {formatNutritionValue(actualNutrition.carbs)}g
                        </Text>
                      </View>
                      <Pressable onPress={() => handleRemoveDraftItem(index)}>
                        <XCircle size={20} color={palette.imperial500} weight="duotone" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={styles.draftMacros}>
              <MacroChip label="蛋白" value={draftTotals.protein} styles={styles} />
              <MacroChip label="脂肪" value={draftTotals.fat} styles={styles} />
              <MacroChip label="碳水" value={draftTotals.carbs} styles={styles} />
              <MacroChip label="热量" value={draftTotals.calories} styles={styles} />
            </View>

            {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

            <Pressable
              style={[styles.primaryButton, (items.length === 0 || saving) && styles.primaryButtonDisabled]}
              onPress={handleSubmit}
              disabled={items.length === 0 || saving}
            >
              <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存餐次'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.savedHeader}>
            <View>
              <Text style={styles.cardTitle}>今日餐次</Text>
              <Text style={styles.cardHint}>每一餐都会显示时间、营养概览和食物组成。</Text>
            </View>
            <View style={styles.savedBadge}>
              <Clock size={14} color={palette.blue500} weight="duotone" />
              <Text style={styles.savedBadgeText}>{meals.length} 张卡片</Text>
            </View>
          </View>
          {meals.length === 0 ? (
            <Text style={styles.emptyText}>今天还没有记录，先在上面挑一餐试试。</Text>
          ) : (
            <View style={styles.savedList}>
              {meals.map((meal) => {
                const option = getMealOption(meal.meal_type);
                const Icon = option.icon;
                const totals = sumMealItemsNutrition(meal.items || []);
                return (
                  <View key={meal.id} style={styles.mealCard}>
                    <View style={styles.mealCardHeader}>
                      <View style={styles.mealCardMain}>
                        <View
                          style={[
                            styles.mealCardIconWrap,
                            { backgroundColor: isDark ? option.surfaceTintDark : option.surfaceTintLight },
                          ]}
                        >
                          <Icon size={18} color={option.tint} weight="fill" />
                        </View>
                        <View>
                          <Text style={styles.mealCardTitle}>{option.label}</Text>
                          <Text style={styles.mealCardTime}>{formatTimeLabel(meal.eaten_at)}</Text>
                        </View>
                      </View>
                      <View style={styles.mealCardCalories}>
                        <Fire size={14} color={palette.orange500} weight="fill" />
                        <Text style={styles.mealCardCaloriesText}>{Math.round(totals.calories)} kcal</Text>
                      </View>
                    </View>

                    <View style={styles.mealCardMacros}>
                      <MacroChip label="蛋白" value={totals.protein} styles={styles} />
                      <MacroChip label="脂肪" value={totals.fat} styles={styles} />
                      <MacroChip label="碳水" value={totals.carbs} styles={styles} />
                    </View>

                    <View style={styles.mealItemWrap}>
                      {(meal.items || []).map((item, index) => (
                        <View key={`${meal.id}-${item.food_name}-${index}`} style={styles.mealItemPill}>
                          <Text style={styles.mealItemPillText}>
                            {item.food_name} {item.weight_g ? `${item.weight_g}g` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>
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

function createStyles(palette: Palette, isDark: boolean) {
  const glassSurface = isDark ? 'rgba(24, 22, 20, 0.92)' : 'rgba(255, 255, 255, 0.86)';
  const glassSurfaceStrong = isDark ? 'rgba(28, 25, 22, 0.94)' : 'rgba(255, 255, 255, 0.82)';
  const glassBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.55)';
  const panelSurface = isDark ? palette.stone100 : palette.white;
  const panelSurfaceAlt = isDark ? palette.stone200 : palette.gold50;
  const panelBorder = isDark ? palette.stone200 : palette.stone100;
  const chipSurface = isDark ? palette.stone200 : palette.stone100;
  const activeSurface = isDark ? 'rgba(255, 140, 66, 0.14)' : palette.gold50;
  const activeSurfaceSoft = isDark ? 'rgba(255, 140, 66, 0.12)' : palette.cardTint;
  const badgeSurface = isDark ? 'rgba(255, 140, 66, 0.12)' : palette.gold50;
  const badgeBorder = isDark ? 'rgba(255, 140, 66, 0.18)' : palette.gold100;
  const primarySurface = isDark ? palette.orange500 : palette.stone900;
  const primaryText = isDark ? palette.surface : palette.gold50;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 140,
      gap: 18,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: palette.stone900,
    },
    heroCard: {
      backgroundColor: glassSurfaceStrong,
      borderRadius: 28,
      padding: 18,
      borderWidth: 1,
      borderColor: glassBorder,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.18 : 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      gap: 14,
    },
    heroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    heroEyebrow: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: palette.orange500,
    },
    heroTitle: {
      marginTop: 6,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
      color: palette.stone900,
      maxWidth: 220,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    heroBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricCard: {
      flexBasis: '47%',
      backgroundColor: panelSurface,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 4,
    },
    metricCardSubtle: {
      backgroundColor: panelSurfaceAlt,
      borderColor: badgeBorder,
    },
    metricLabel: {
      fontSize: 12,
      color: palette.stone500,
    },
    metricValue: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.stone900,
    },
    metricUnit: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.stone500,
    },
    projectionStrip: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: isDark ? palette.stone200 : palette.stone900,
      gap: 4,
    },
    projectionLabel: {
      fontSize: 12,
      color: isDark ? palette.stone600 : palette.gold200,
    },
    projectionValue: {
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? palette.stone900 : palette.gold50,
      lineHeight: 20,
    },
    card: {
      backgroundColor: glassSurface,
      borderRadius: 26,
      padding: 18,
      borderWidth: 1,
      borderColor: glassBorder,
      shadowColor: '#000',
      shadowOpacity: isDark ? 0.16 : 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      gap: 14,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    cardHint: {
      marginTop: 2,
      fontSize: 13,
      lineHeight: 19,
      color: palette.stone500,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone700,
      marginTop: 2,
    },
    mealTypeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    mealTypeCard: {
      flexBasis: '47%',
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: panelBorder,
      backgroundColor: panelSurface,
      gap: 8,
    },
    mealTypeIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: panelSurfaceAlt,
    },
    mealTypeTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.stone900,
    },
    mealTypeCaption: {
      fontSize: 12,
      color: palette.stone500,
    },
    categoryRow: {
      gap: 10,
      paddingRight: 8,
    },
    categoryChip: {
      width: 128,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 4,
    },
    categoryChipActive: {
      backgroundColor: activeSurface,
      borderColor: palette.orange500,
    },
    categoryChipLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone900,
    },
    categoryChipLabelActive: {
      color: palette.stone900,
    },
    categoryChipHint: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.stone500,
    },
    categoryChipHintActive: {
      color: palette.stone600,
    },
    foodGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    foodCard: {
      flexBasis: '47%',
      borderRadius: 22,
      padding: 14,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 8,
      minHeight: 128,
    },
    foodCardActive: {
      borderColor: palette.orange500,
      backgroundColor: activeSurface,
    },
    foodIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? palette.stone200 : palette.surfaceWarm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    foodIconWrapActive: {
      backgroundColor: palette.orange500,
    },
    foodName: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.stone900,
    },
    foodHint: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.stone500,
    },
    foodMacro: {
      marginTop: 'auto',
      fontSize: 12,
      fontWeight: '600',
      color: palette.orange500,
    },
    selectionPreview: {
      backgroundColor: activeSurfaceSoft,
      borderRadius: 24,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    selectionPreviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    selectionPreviewTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone900,
    },
    selectionPreviewHint: {
      marginTop: 4,
      fontSize: 12,
      color: palette.stone500,
    },
    selectionPreviewBadge: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: panelSurface,
    },
    selectionPreviewBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.orange500,
    },
    weightRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    weightChip: {
      minWidth: 68,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      alignItems: 'center',
    },
    weightChipActive: {
      backgroundColor: activeSurface,
      borderColor: palette.orange500,
    },
    weightChipText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone700,
    },
    weightChipTextActive: {
      color: palette.stone900,
    },
    addButton: {
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: isDark ? palette.stone200 : palette.surfaceWarm,
      borderWidth: 1,
      borderColor: isDark ? palette.stone300 : palette.gold100,
    },
    addButtonText: {
      fontSize: 15,
      fontWeight: '700',
      color: palette.stone900,
    },
    draftCard: {
      borderRadius: 24,
      padding: 16,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 14,
    },
    draftHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    draftTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: palette.stone900,
    },
    draftHint: {
      marginTop: 4,
      fontSize: 12,
      color: palette.stone500,
    },
    draftBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    draftBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    draftList: {
      gap: 10,
    },
    draftItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.stone100,
    },
    draftItemMain: {
      flex: 1,
      gap: 4,
    },
    draftItemTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone900,
    },
    draftItemMeta: {
      fontSize: 12,
      lineHeight: 17,
      color: palette.stone500,
    },
    draftMacros: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    macroChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: chipSurface,
    },
    macroChipLabel: {
      fontSize: 12,
      color: palette.stone500,
    },
    macroChipValue: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone800,
    },
    primaryButton: {
      backgroundColor: primarySurface,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.45,
    },
    primaryButtonText: {
      fontSize: 15,
      color: primaryText,
      fontWeight: '800',
    },
    errorText: {
      fontSize: 13,
      color: palette.imperial500,
    },
    emptyText: {
      fontSize: 14,
      lineHeight: 20,
      color: palette.stone500,
    },
    savedHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    savedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    savedBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.blue500,
    },
    savedList: {
      gap: 12,
    },
    mealCard: {
      borderRadius: 22,
      padding: 16,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 12,
    },
    mealCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    mealCardMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    mealCardIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mealCardTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone900,
    },
    mealCardTime: {
      marginTop: 4,
      fontSize: 12,
      color: palette.stone500,
    },
    mealCardCalories: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
    },
    mealCardCaloriesText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    mealCardMacros: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mealItemWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mealItemPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? palette.stone200 : palette.surfaceWarm,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    mealItemPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: palette.stone700,
    },
  });
}
