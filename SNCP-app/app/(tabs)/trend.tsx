import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { fetchNutritionTrend } from '@/services/dashboard';

type TrendItem = {
  date: string;
  totals: Record<string, number>;
};

export default function TrendScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const loadTrend = useCallback(async () => {
    if (!token) {
      setTrend([]);
      setErrorText('登录状态失效，请重新登录后再查看趋势。');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchNutritionTrend(token, 30);
      setTrend((res.trend || []).slice().reverse());
      setErrorText('');
    } catch (error) {
      console.error('[Trend] failed', error);
      setErrorText(error instanceof Error ? error.message : '趋势刷新失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void loadTrend();
    }, [loadTrend]),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTrend} />}
      >
        <Text style={styles.title}>长期趋势</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>近30天热量趋势</Text>
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          {trend.length === 0 ? (
            <Text style={styles.emptyText}>暂无趋势数据。</Text>
          ) : (
            trend.map((item) => (
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
