import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CaretLeft,
  CaretRight,
  ClockCounterClockwise,
  Coffee,
  Fire,
  ForkKnife,
  MoonStars,
  SunHorizon,
} from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';
import { fetchMealsByDate } from '@/services/meals';
import type { Meal } from '@/types/meal';
import { formatTimeLabel } from '@/utils/date';
import { sumMealItemsNutrition } from '@/utils/nutrition';

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

function getMealOption(value: string) {
  return MEAL_OPTIONS.find((item) => item.value === value) ?? MEAL_OPTIONS[0];
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateKey(dateKey: string, offsetDays: number) {
  const base = new Date(`${dateKey}T00:00:00`);
  base.setDate(base.getDate() + offsetDays);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatHistoryDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
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
      <Text style={styles.macroChipValue}>{Math.round(value * 10) / 10}g</Text>
    </View>
  );
}

export default function MealHistoryScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  const todayKey = useMemo(() => getTodayKey(), []);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const loadMeals = useCallback(async () => {
    if (!token) {
      setMeals([]);
      setErrorText('登录状态失效，请重新登录后再查看历史卡片。');
      return;
    }

    setLoading(true);
    try {
      const res = await fetchMealsByDate(selectedDate, token);
      setMeals(res.meals || []);
      setErrorText('');
    } catch (error) {
      console.error('[MealHistory] load failed', error);
      setMeals([]);
      setErrorText(error instanceof Error ? error.message : '获取历史饮食卡片失败');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, token]);

  useFocusEffect(
    useCallback(() => {
      void loadMeals();
    }, [loadMeals]),
  );

  useEffect(() => {
    void loadMeals();
  }, [loadMeals]);

  const canGoNext = selectedDate < todayKey;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={18} color={palette.stone800} />
          <Text style={styles.backText}>返回记录页</Text>
        </Pressable>

        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <ClockCounterClockwise size={14} color={palette.orange500} weight="fill" />
            <Text style={styles.heroBadgeText}>历史卡片</Text>
          </View>
          <Text style={styles.title}>查看曾经的饮食记录</Text>
          <Text style={styles.heroText}>按日期切换查看过去的饮食卡片，方便回看和后续继续补充编辑能力。</Text>
        </View>

        <View style={styles.dateBar}>
          <Pressable style={styles.dateSwitchButton} onPress={() => setSelectedDate(shiftDateKey(selectedDate, -1))}>
            <CaretLeft size={16} color={palette.stone700} weight="bold" />
          </Pressable>

          <View style={styles.dateLabelWrap}>
            <Text style={styles.dateLabel}>{formatHistoryDate(selectedDate)}</Text>
            <Text style={styles.dateHint}>{selectedDate === todayKey ? '今天' : selectedDate}</Text>
          </View>

          <Pressable
            style={[styles.dateSwitchButton, !canGoNext && styles.dateSwitchButtonDisabled]}
            onPress={() => canGoNext && setSelectedDate(shiftDateKey(selectedDate, 1))}
            disabled={!canGoNext}
          >
            <CaretRight size={16} color={canGoNext ? palette.stone700 : palette.stone300} weight="bold" />
          </Pressable>
        </View>

        {selectedDate !== todayKey ? (
          <Pressable style={styles.todayButton} onPress={() => setSelectedDate(todayKey)}>
            <Text style={styles.todayButtonText}>回到今天</Text>
          </Pressable>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>饮食卡片</Text>
              <Text style={styles.cardHint}>这里会显示所选日期的全部餐次卡片。</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{meals.length} 张</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={palette.orange500} />
              <Text style={styles.helperText}>正在加载历史卡片...</Text>
            </View>
          ) : errorText ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : meals.length === 0 ? (
            <Text style={styles.emptyText}>这一天还没有饮食卡片，换一天看看吧。</Text>
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
  const panelBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(229, 211, 194, 0.65)';
  const panelSurface = isDark ? 'rgba(32, 30, 28, 0.88)' : palette.white;
  const badgeSurface = isDark ? 'rgba(255,255,255,0.06)' : palette.gold50;
  const badgeBorder = isDark ? 'rgba(255,255,255,0.08)' : palette.gold100;
  const chipSurface = isDark ? palette.stone200 : palette.surfaceWarm;

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      paddingTop: 20,
      paddingHorizontal: 20,
      paddingBottom: 140,
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
    heroCard: {
      borderRadius: 24,
      padding: 18,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
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
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
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
    dateBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    dateSwitchButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    dateSwitchButtonDisabled: {
      opacity: 0.45,
    },
    dateLabelWrap: {
      flex: 1,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 2,
    },
    dateLabel: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.stone900,
    },
    dateHint: {
      fontSize: 12,
      color: palette.stone500,
    },
    todayButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    todayButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    card: {
      borderRadius: 26,
      padding: 18,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 14,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
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
    countBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: badgeSurface,
      borderWidth: 1,
      borderColor: badgeBorder,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.blue500,
    },
    loadingWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    helperText: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone500,
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
    savedList: {
      gap: 12,
    },
    mealCard: {
      borderRadius: 22,
      padding: 16,
      backgroundColor: isDark ? 'rgba(24, 22, 21, 0.84)' : 'rgba(255, 248, 241, 0.82)',
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
      borderWidth: 1,
      borderColor: badgeBorder,
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
    mealItemWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    mealItemPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: chipSurface,
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
