import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkle } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { TopBar } from '@/components/top-bar';
import { CaloriesTrendCard, MacroRatioCard, type CalorieTrendBarPoint } from '@/components/ui/nutrition-insights';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { fetchNutritionTrend, fetchTodayDashboard } from '@/services/dashboard';
import { subscribeNutritionRefresh } from '@/services/nutrition-refresh';
import type { DashboardData, NutritionTrendPoint } from '@/types/dashboard';
import { formatDateLabel } from '@/utils/date';

export default function HomeScreen() {
  const router = useRouter();
  const palette = usePalette();
  const token = useAuthToken();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [trend, setTrend] = useState<NutritionTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const currentDate = useMemo(() => formatDateLabel(), []);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    if (!token) {
      return;
    }
    if (!options?.silent) {
      setLoading(true);
    }
    try {
      const [dashboardResult, trendResult] = await Promise.allSettled([
        fetchTodayDashboard(token),
        fetchNutritionTrend(token, 7),
      ]);

      if (dashboardResult.status === 'fulfilled') {
        setData(dashboardResult.value);
      } else {
        console.error('[Dashboard] failed:', dashboardResult.reason);
      }

      if (trendResult.status === 'fulfilled') {
        setTrend(sortTrendAscending(trendResult.value.trend || []));
      } else {
        console.error('[Dashboard trend] failed:', trendResult.reason);
      }
    } catch (error) {
      console.error('[Dashboard] failed:', error);
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadData();
  }, [loadData, token]);

  useEffect(() => {
    return subscribeNutritionRefresh(() => {
      void loadData({ silent: true });
    });
  }, [loadData]);

  const calories = Math.round(data?.totals?.calories ?? 0);
  const mealCount = data?.meal_count ?? 0;
  const ratio = data?.macro_ratio ?? { protein: 0, fat: 0, carbs: 0 };
  const displayWarnings = data?.ai?.risks?.length ? data.ai.risks : data?.warnings ?? [];
  const displaySuggestions = data?.ai?.next_actions?.length ? data.ai.next_actions : data?.suggestions ?? [];
  const analysisSummary = data?.ai?.summary?.trim() || '';
  const trendPoints = useMemo<CalorieTrendBarPoint[]>(
    () =>
      trend.map((item) => ({
        key: item.date,
        label: formatTrendLabel(item.date),
        value: Math.round(item.totals.calories || 0),
      })),
    [trend],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <TopBar title="健康看板" dateText={currentDate} variant="home" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>今日饮食概览</Text>
            <View style={styles.badge}>
              <Sparkle size={12} color={palette.orange500} weight="fill" />
              <Text style={styles.badgeText}>营养评分 {data?.score ?? 0}</Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>{mealCount}</Text>
              <Text style={styles.summaryLabel}>已记录餐次</Text>
            </View>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>{calories}</Text>
              <Text style={styles.summaryLabel}>千卡</Text>
            </View>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>{Math.round(ratio.protein * 100)}%</Text>
              <Text style={styles.summaryLabel}>蛋白占比</Text>
            </View>
          </View>
          <View style={styles.ratioRow}>
            <View style={[styles.ratioChip, styles.ratioChipProtein]}>
              <Text style={styles.ratioLabel}>蛋白</Text>
              <Text style={styles.ratioValue}>{Math.round(ratio.protein * 100)}%</Text>
            </View>
            <View style={[styles.ratioChip, styles.ratioChipFat]}>
              <Text style={styles.ratioLabel}>脂肪</Text>
              <Text style={styles.ratioValue}>{Math.round(ratio.fat * 100)}%</Text>
            </View>
            <View style={[styles.ratioChip, styles.ratioChipCarb]}>
              <Text style={styles.ratioLabel}>碳水</Text>
              <Text style={styles.ratioValue}>{Math.round(ratio.carbs * 100)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.dualChartRow}>
          <MacroRatioCard
            title="脂蛋碳占比"
            subtitle="按今日摄入供能结构显示"
            ratio={ratio}
          />
          <CaloriesTrendCard
            title="热量趋势"
            subtitle="最近 7 天摄入热量变化"
            points={trendPoints}
            emptyText="最近 7 天还没有记录"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>健康提醒</Text>
          {displayWarnings.length === 0 ? (
            <Text style={styles.cardHint}>今日暂无明显饮食禁忌提醒。</Text>
          ) : (
            displayWarnings.map((item) => (
              <Text key={item} style={styles.noticeItem}>
                {item}
              </Text>
            ))
          )}
          <View style={styles.tipDivider} />
          <Text style={styles.cardTitle}>营养建议</Text>
          {analysisSummary ? <Text style={styles.analysisSummary}>{analysisSummary}</Text> : null}
          {displaySuggestions.length === 0 ? (
            <Text style={styles.cardHint}>继续保持，饮食结构较均衡。</Text>
          ) : (
            displaySuggestions.map((item) => (
              <Text key={item} style={styles.tipItem}>
                {item}
              </Text>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>快捷入口</Text>
          <View style={styles.quickRow}>
            <Pressable style={styles.quickButton} onPress={() => router.push('/(tabs)/record')}>
              <Text style={styles.quickText}>饮食记录</Text>
            </Pressable>
            <Pressable style={styles.quickButton} onPress={() => router.push('/(tabs)/recommend')}>
              <Text style={styles.quickText}>推荐食谱</Text>
            </Pressable>
          </View>
          <View style={styles.quickRow}>
            <Pressable style={styles.quickButton} onPress={() => router.push('/(tabs)/trend')}>
              <Text style={styles.quickText}>查看趋势报告</Text>
            </Pressable>
            <Pressable style={styles.quickButton} onPress={() => router.push('/(tabs)/settings')}>
              <Text style={styles.quickText}>完善健康档案</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <BottomDock
        activeTab="home"
        onHome={() => router.replace('/(tabs)')}
        onRecord={() => router.replace('/(tabs)/record')}
        onRecommend={() => router.replace('/(tabs)/recommend')}
        onTrend={() => router.replace('/(tabs)/trend')}
        onProfile={() => router.replace('/(tabs)/settings')}
      />
    </SafeAreaView>
  );
}

function sortTrendAscending(items: NutritionTrendPoint[]) {
  return [...items].sort((left, right) => left.date.localeCompare(right.date));
}

function formatTrendLabel(date: string) {
  const [, month = '--', day = '--'] = date.split('-');
  return `${month}/${day}`;
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      paddingTop: 96,
      paddingHorizontal: 20,
      paddingBottom: 120,
      gap: 16,
    },
    card: {
      backgroundColor: palette.white,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.stone900,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: palette.gold50,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    summaryBlock: {
      alignItems: 'center',
      flex: 1,
    },
    summaryValue: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.stone900,
    },
    summaryLabel: {
      marginTop: 4,
      fontSize: 12,
      color: palette.stone500,
    },
    ratioRow: {
      marginTop: 12,
      flexDirection: 'row',
      gap: 8,
    },
    ratioChip: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    ratioChipProtein: {
      backgroundColor: palette.warm100,
    },
    ratioChipFat: {
      backgroundColor: palette.rose100,
    },
    ratioChipCarb: {
      backgroundColor: palette.gold100,
    },
    ratioLabel: {
      fontSize: 12,
      color: palette.stone500,
    },
    ratioValue: {
      marginTop: 4,
      fontSize: 16,
      fontWeight: '700',
      color: palette.stone800,
    },
    dualChartRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
    },
    cardHint: {
      marginTop: 8,
      fontSize: 14,
      color: palette.stone500,
    },
    noticeItem: {
      marginTop: 6,
      fontSize: 14,
      color: palette.imperial500,
    },
    tipDivider: {
      marginVertical: 12,
      height: 1,
      backgroundColor: palette.stone100,
    },
    tipItem: {
      marginTop: 6,
      fontSize: 14,
      color: palette.stone700,
    },
    analysisSummary: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 20,
      color: palette.stone600,
    },
    quickRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    quickButton: {
      flex: 1,
      backgroundColor: palette.surfaceWarm,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.stone100,
    },
    quickText: {
      fontSize: 14,
      fontWeight: '600',
      color: palette.stone700,
    },
  });
}
