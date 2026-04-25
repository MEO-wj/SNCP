import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { CaloriesTrendCard, MacroRatioCard, type CalorieTrendBarPoint } from '@/components/ui/nutrition-insights';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { fetchNutritionTrend } from '@/services/dashboard';
import { readTrendExperienceCache, writeTrendExperienceCache } from '@/services/nutrition-cache';
import type { NutritionTrendPoint } from '@/types/dashboard';

const TREND_DAYS = 30;
const FOCUS_REFRESH_INTERVAL_MS = 15_000;

export default function TrendScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [trend, setTrend] = useState<NutritionTrendPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const latestTrendRef = useRef<NutritionTrendPoint[]>([]);
  const bootstrappedRef = useRef(false);
  const lastLoadAtRef = useRef(0);

  useEffect(() => {
    latestTrendRef.current = trend;
  }, [trend]);

  const loadTrend = useCallback(
    async (options?: { force?: boolean; silent?: boolean }) => {
      if (!token) {
        setTrend([]);
        setErrorText('登录状态失效，请重新登录后再查看趋势。');
        return;
      }

      const now = Date.now();
      const shouldSkipFocusRefresh =
        options?.silent &&
        !options?.force &&
        latestTrendRef.current.length > 0 &&
        now - lastLoadAtRef.current < FOCUS_REFRESH_INTERVAL_MS;

      if (shouldSkipFocusRefresh) {
        return;
      }

      lastLoadAtRef.current = now;
      if (!options?.silent) {
        setLoading(true);
      }

      try {
        const res = await fetchNutritionTrend(token, TREND_DAYS);
        const nextTrend = sortTrendAscending(res.trend || []);
        setTrend(nextTrend);
        setErrorText('');
        await writeTrendExperienceCache(TREND_DAYS, nextTrend);
      } catch (error) {
        console.error('[Trend] failed', error);
        setErrorText(
          latestTrendRef.current.length > 0
            ? '当前显示的是最近一次缓存趋势，暂时无法连接后端，稍后再试。'
            : error instanceof Error
            ? error.message
            : '趋势刷新失败，请稍后重试。',
        );
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
      bootstrappedRef.current = false;
      return;
    }

    let cancelled = false;
    void (async () => {
      const cached = await readTrendExperienceCache(TREND_DAYS);
      if (cancelled) {
        return;
      }

      if (cached?.trend?.length) {
        setTrend(sortTrendAscending(cached.trend));
        setErrorText('');
      }

      bootstrappedRef.current = true;
      void loadTrend({ force: true, silent: Boolean(cached?.trend?.length) });
    })();

    return () => {
      cancelled = true;
    };
  }, [loadTrend, token]);

  useFocusEffect(
    useCallback(() => {
      if (!bootstrappedRef.current) {
        return;
      }
      void loadTrend({ silent: true });
    }, [loadTrend]),
  );

  const handleRefresh = useCallback(() => {
    void loadTrend({ force: true });
  }, [loadTrend]);

  const overviewRatio = useMemo(() => {
    const totals = trend.reduce(
      (sum, item) => {
        sum.protein += item.totals.protein || 0;
        sum.fat += item.totals.fat || 0;
        sum.carbs += item.totals.carbs || 0;
        return sum;
      },
      { protein: 0, fat: 0, carbs: 0 },
    );
    const totalMacroCalories = totals.protein * 4 + totals.fat * 9 + totals.carbs * 4;

    if (totalMacroCalories <= 0) {
      return { protein: 0, fat: 0, carbs: 0 };
    }

    return {
      protein: (totals.protein * 4) / totalMacroCalories,
      fat: (totals.fat * 9) / totalMacroCalories,
      carbs: (totals.carbs * 4) / totalMacroCalories,
    };
  }, [trend]);

  const recentTrendPoints = useMemo<CalorieTrendBarPoint[]>(
    () =>
      trend.slice(-7).map((item) => ({
        key: item.date,
        label: formatTrendLabel(item.date),
        value: Math.round(item.totals.calories || 0),
      })),
    [trend],
  );

  const historyRows = useMemo(() => [...trend].slice().reverse(), [trend]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh} />}
      >
        <Text style={styles.title}>长期趋势</Text>
        <View style={styles.dualChartRow}>
          <MacroRatioCard title="区间营养结构" subtitle="近 30 天脂肪、蛋白、碳水供能占比" ratio={overviewRatio} />
          <CaloriesTrendCard
            title="热量预览"
            subtitle="近 7 天摄入波动"
            points={recentTrendPoints}
            emptyText="最近 7 天还没有记录"
          />
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>近 30 天热量趋势</Text>
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          {historyRows.length === 0 ? (
            <Text style={styles.emptyText}>暂无趋势数据。</Text>
          ) : (
            historyRows.map((item) => (
              <View key={item.date} style={styles.trendRow}>
                <Text style={styles.trendDate}>{item.date.slice(5)}</Text>
                <View style={styles.trendBarWrap}>
                  <View style={[styles.trendBar, { width: `${Math.min(100, (item.totals.calories || 0) / 25)}%` }]} />
                </View>
                <Text style={styles.trendValue}>{Math.round(item.totals.calories || 0)} 千卡</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <BottomDock
        activeTab="trend"
        onHome={() => router.navigate('/(tabs)')}
        onRecord={() => router.navigate('/(tabs)/record')}
        onRecommend={() => router.navigate('/(tabs)/recommend')}
        onTrend={() => router.navigate('/(tabs)/trend')}
        onProfile={() => router.navigate('/(tabs)/settings')}
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
    dualChartRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
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
    emptyText: {
      fontSize: 14,
      color: palette.stone500,
    },
    errorText: {
      fontSize: 13,
      color: palette.imperial500,
    },
    trendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    trendDate: {
      width: 42,
      fontSize: 12,
      color: palette.stone500,
    },
    trendBarWrap: {
      flex: 1,
      height: 8,
      backgroundColor: palette.stone100,
      borderRadius: 999,
      overflow: 'hidden',
    },
    trendBar: {
      height: '100%',
      backgroundColor: palette.orange500,
      borderRadius: 999,
    },
    trendValue: {
      width: 70,
      fontSize: 12,
      color: palette.stone700,
      textAlign: 'right',
    },
  });
}
