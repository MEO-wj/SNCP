import React, { useMemo } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

import type { Palette } from '@/constants/palette';
import { usePalette } from '@/hooks/use-palette';

type MacroRatio = {
  protein: number;
  fat: number;
  carbs: number;
};

export type CalorieTrendBarPoint = {
  key: string;
  label: string;
  value: number;
};

type MacroRatioCardProps = {
  title: string;
  subtitle: string;
  ratio: MacroRatio;
  style?: ViewStyle;
};

type CaloriesTrendCardProps = {
  title: string;
  subtitle: string;
  points: CalorieTrendBarPoint[];
  emptyText?: string;
  style?: ViewStyle;
};

type Segment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export function MacroRatioCard({ title, subtitle, ratio, style }: MacroRatioCardProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const segments = useMemo<Segment[]>(
    () => [
      { key: 'protein', label: '蛋白', value: Math.max(0, ratio.protein || 0), color: palette.orange500 },
      { key: 'fat', label: '脂肪', value: Math.max(0, ratio.fat || 0), color: palette.imperial500 },
      { key: 'carbs', label: '碳水', value: Math.max(0, ratio.carbs || 0), color: palette.blue500 },
    ],
    [palette.blue500, palette.imperial500, palette.orange500, ratio.carbs, ratio.fat, ratio.protein],
  );

  const total = useMemo(
    () => segments.reduce((sum, segment) => sum + segment.value, 0),
    [segments],
  );

  const dominant = useMemo(() => {
    const base = segments.reduce((top, current) => (current.value > top.value ? current : top), segments[0]);
    return {
      label: base.label,
      percent: Math.round((total > 0 ? base.value / total : 0) * 100),
    };
  }, [segments, total]);

  const displaySegments = useMemo(
    () => [...segments].sort((left, right) => right.value - left.value),
    [segments],
  );

  return (
    <View style={[styles.chartCard, style]}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>
      <View style={styles.visualPanel}>
        <View style={styles.orbSoft} />
        <View style={[styles.orbSoft, styles.orbWarm]} />
        <View style={styles.macroLayout}>
          <View style={styles.ringWrap}>
            <MacroDonut palette={palette} segments={segments} total={total} />
            <View pointerEvents="none" style={styles.ringCenter}>
              <Text style={styles.ringCenterValue}>{dominant.percent}%</Text>
              <Text style={styles.ringCenterLabel}>{dominant.label}</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            {displaySegments.map((segment) => {
              const percent = Math.round((total > 0 ? segment.value / total : 0) * 100);
              return (
                <View key={segment.key} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                  <View style={styles.legendTextWrap}>
                    <Text style={styles.legendLabel}>{segment.label}</Text>
                    <Text style={styles.legendValue}>{percent}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

export function CaloriesTrendCard({
  title,
  subtitle,
  points,
  emptyText = '暂无热量趋势数据',
  style,
}: CaloriesTrendCardProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const latest = points[points.length - 1];
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const averageValue = points.length
    ? Math.round(points.reduce((sum, point) => sum + point.value, 0) / points.length)
    : 0;
  const firstLabel = points[0]?.label ?? '--';
  const lastLabel = latest?.label ?? '--';

  return (
    <View style={[styles.chartCard, style]}>
      <View style={styles.chartHeaderRow}>
        <View style={styles.chartHeaderText}>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricPillValue}>{Math.round(latest?.value ?? 0)}</Text>
          <Text style={styles.metricPillLabel}>kcal</Text>
        </View>
      </View>
      <View style={[styles.visualPanel, styles.trendPanel]}>
        <View style={styles.orbSoft} />
        <View style={[styles.orbSoft, styles.orbWarm]} />
        {points.length === 0 ? (
          <Text style={styles.emptyText}>{emptyText}</Text>
        ) : (
          <>
            <View style={styles.trendCanvas}>
              <Svg width="100%" height="100%" viewBox="0 0 180 118" preserveAspectRatio="none">
                <Defs>
                  <SvgLinearGradient id="caloriesBarGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={palette.gold400} />
                    <Stop offset="100%" stopColor={palette.orange500} />
                  </SvgLinearGradient>
                  <SvgLinearGradient id="caloriesBarGradientActive" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={palette.gold500} />
                    <Stop offset="100%" stopColor={palette.imperial500} />
                  </SvgLinearGradient>
                </Defs>
                <TrendBars
                  averageValue={averageValue}
                  maxValue={maxValue}
                  palette={palette}
                  points={points}
                />
              </Svg>
            </View>
            <View style={styles.trendMetaRow}>
              <Text style={styles.trendMetaText}>{firstLabel}</Text>
              <Text style={styles.trendMetaText}>均值 {averageValue} kcal</Text>
              <Text style={styles.trendMetaText}>{lastLabel}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function MacroDonut({
  palette,
  segments,
  total,
}: {
  palette: Palette;
  segments: Segment[];
  total: number;
}) {
  const size = 96;
  const strokeWidth = 12;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Circle
        cx="48"
        cy="48"
        r={radius}
        stroke={palette.stone100}
        strokeWidth={strokeWidth}
        fill="none"
      />
      {segments.map((segment) => {
        if (total <= 0 || segment.value <= 0) {
          return null;
        }
        const fraction = segment.value / total;
        const gap = Math.min(0.022, fraction * 0.22);
        const visibleFraction = Math.max(fraction - gap, 0);
        const strokeLength = circumference * visibleFraction;
        const circle = (
          <Circle
            key={segment.key}
            cx="48"
            cy="48"
            r={radius}
            stroke={segment.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${strokeLength} ${circumference}`}
            strokeDashoffset={-offset * circumference}
            rotation="-90"
            origin="48, 48"
          />
        );
        offset += fraction;
        return circle;
      })}
    </Svg>
  );
}

function TrendBars({
  averageValue,
  maxValue,
  palette,
  points,
}: {
  averageValue: number;
  maxValue: number;
  palette: Palette;
  points: CalorieTrendBarPoint[];
}) {
  const viewBoxWidth = 180;
  const left = 10;
  const right = 10;
  const chartTop = 10;
  const chartBottom = 92;
  const chartHeight = chartBottom - chartTop;
  const slotWidth = (viewBoxWidth - left - right) / Math.max(points.length, 1);
  const barWidth = Math.min(16, Math.max(10, slotWidth * 0.58));
  const averageY = chartBottom - (averageValue / maxValue) * chartHeight;

  return (
    <>
      <Line
        x1={left}
        x2={viewBoxWidth - right}
        y1={averageY}
        y2={averageY}
        stroke={palette.stone300}
        strokeDasharray="4 4"
        strokeWidth={1.5}
        opacity={0.9}
      />
      <Line
        x1={left}
        x2={viewBoxWidth - right}
        y1={chartBottom + 5}
        y2={chartBottom + 5}
        stroke={palette.stone200}
        strokeWidth={1.5}
      />
      {points.map((point, index) => {
        const barHeight = point.value > 0 ? Math.max(10, (point.value / maxValue) * chartHeight) : 6;
        const x = left + index * slotWidth + (slotWidth - barWidth) / 2;
        const y = chartBottom - barHeight;
        const gradient = index === points.length - 1 ? 'url(#caloriesBarGradientActive)' : 'url(#caloriesBarGradient)';

        return (
          <Rect
            key={point.key}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            fill={gradient}
          />
        );
      })}
    </>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    chartCard: {
      flex: 1,
      minWidth: 0,
      backgroundColor: palette.white,
      borderRadius: 22,
      padding: 13,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 6,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
    },
    chartHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
    },
    chartHeaderText: {
      flex: 1,
      minWidth: 0,
    },
    chartTitle: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.stone900,
    },
    chartSubtitle: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 16,
      color: palette.stone500,
    },
    visualPanel: {
      position: 'relative',
      marginTop: 4,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.surfaceWarm,
      paddingHorizontal: 8,
      paddingVertical: 8,
      overflow: 'hidden',
      minHeight: 126,
      justifyContent: 'center',
    },
    trendPanel: {
      flex: 1,
      minHeight: 126,
      justifyContent: 'space-between',
      paddingBottom: 8,
    },
    trendCanvas: {
      flex: 1,
      minHeight: 92,
      justifyContent: 'flex-end',
    },
    orbSoft: {
      position: 'absolute',
      width: 92,
      height: 92,
      borderRadius: 999,
      backgroundColor: palette.gold100,
      opacity: 0.42,
      top: -18,
      right: -20,
    },
    orbWarm: {
      width: 84,
      height: 84,
      backgroundColor: palette.rose100,
      opacity: 0.45,
      top: undefined,
      right: undefined,
      left: -10,
      bottom: -22,
    },
    macroLayout: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    },
    ringWrap: {
      width: 96,
      height: 96,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenterValue: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    ringCenterLabel: {
      marginTop: 2,
      fontSize: 10,
      color: palette.stone500,
      fontWeight: '700',
    },
    legendRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'stretch',
      justifyContent: 'space-between',
      gap: 6,
    },
    legendItem: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderRadius: 12,
      paddingHorizontal: 6,
      paddingVertical: 6,
      backgroundColor: palette.white,
      borderWidth: 1,
      borderColor: palette.stone100,
    },
    legendDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
    },
    legendTextWrap: {
      minWidth: 0,
      alignItems: 'center',
      gap: 1,
    },
    legendLabel: {
      fontSize: 10,
      color: palette.stone600,
      fontWeight: '600',
    },
    legendValue: {
      fontSize: 11,
      color: palette.stone900,
      fontWeight: '800',
    },
    metricPill: {
      borderRadius: 13,
      paddingHorizontal: 9,
      paddingVertical: 5,
      backgroundColor: palette.gold50,
      borderWidth: 1,
      borderColor: palette.gold100,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 54,
    },
    metricPillValue: {
      fontSize: 13,
      fontWeight: '800',
      color: palette.stone900,
    },
    metricPillLabel: {
      fontSize: 9,
      color: palette.orange500,
      fontWeight: '700',
      marginTop: 1,
    },
    trendMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
      marginTop: 2,
    },
    trendMetaText: {
      fontSize: 9,
      color: palette.stone500,
      fontWeight: '700',
    },
    emptyText: {
      fontSize: 13,
      color: palette.stone500,
      textAlign: 'center',
    },
  });
}
