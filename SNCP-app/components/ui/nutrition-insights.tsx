import React, { useEffect, useId, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
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

type ActiveMacroInfo = {
  key: string;
  label: string;
  percent: number;
  color: string;
};

type ActiveCalorieInfo = {
  key: string;
  label: string;
  value: number;
  leftPercent: number;
  placement: 'left' | 'center' | 'right';
};

const insightOverlayListeners = new Set<(ownerId: string | null) => void>();

function setActiveInsightOwner(ownerId: string | null) {
  insightOverlayListeners.forEach((listener) => listener(ownerId));
}

function subscribeInsightOverlay(listener: (ownerId: string | null) => void) {
  insightOverlayListeners.add(listener);
  return () => {
    insightOverlayListeners.delete(listener);
  };
}

function resolveMacroSegmentFromTouch(
  locationX: number,
  locationY: number,
  segments: Segment[],
  total: number,
) {
  if (total <= 0) {
    return null;
  }

  const center = 48;
  const dx = locationX - center;
  const dy = locationY - center;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const innerRadius = 16;
  const outerRadius = 44;

  if (distance < innerRadius || distance > outerRadius) {
    return null;
  }

  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const normalizedAngle = (angle + 450) % 360;
  let accumulatedAngle = 0;

  for (const segment of segments) {
    if (segment.value <= 0) {
      continue;
    }

    const segmentAngle = (segment.value / total) * 360;
    if (normalizedAngle >= accumulatedAngle && normalizedAngle < accumulatedAngle + segmentAngle) {
      return segment.key;
    }
    accumulatedAngle += segmentAngle;
  }

  return segments.find((segment) => segment.value > 0)?.key ?? null;
}

export function MacroRatioCard({ title, subtitle, ratio, style }: MacroRatioCardProps) {
  const ownerId = useId();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [activeSegmentKey, setActiveSegmentKey] = useState<string | null>(null);

  const segments = useMemo<Segment[]>(
    () => [
      { key: 'protein', label: '蛋白', value: Math.max(0, ratio.protein || 0), color: palette.orange500 },
      { key: 'fat', label: '脂肪', value: Math.max(0, ratio.fat || 0), color: palette.imperial500 },
      { key: 'carbs', label: '碳水', value: Math.max(0, ratio.carbs || 0), color: palette.blue500 },
    ],
    [palette.blue500, palette.imperial500, palette.orange500, ratio.carbs, ratio.fat, ratio.protein],
  );

  const total = useMemo(() => segments.reduce((sum, segment) => sum + segment.value, 0), [segments]);

  const dominant = useMemo<ActiveMacroInfo>(() => {
    const base = segments.reduce((top, current) => (current.value > top.value ? current : top), segments[0]);
    return {
      key: base.key,
      label: base.label,
      percent: Math.round((total > 0 ? base.value / total : 0) * 100),
      color: base.color,
    };
  }, [segments, total]);

  const activeSegment = useMemo<ActiveMacroInfo>(() => {
    const current = segments.find((segment) => segment.key === activeSegmentKey) ?? null;
    if (!current) {
      return dominant;
    }

    return {
      key: current.key,
      label: current.label,
      percent: Math.round((total > 0 ? current.value / total : 0) * 100),
      color: current.color,
    };
  }, [activeSegmentKey, dominant, segments, total]);

  const displaySegments = useMemo(() => [...segments].sort((left, right) => right.value - left.value), [segments]);

  useEffect(() => {
    return subscribeInsightOverlay((nextOwnerId) => {
      if (nextOwnerId !== ownerId) {
        setActiveSegmentKey(null);
      }
    });
  }, [ownerId]);

  return (
    <View style={[styles.chartCard, style]}>
      <Text style={styles.chartTitle}>{title}</Text>
      <Text style={styles.chartSubtitle}>{subtitle}</Text>
      <View style={styles.visualPanel}>
        <View style={styles.orbSoft} />
        <View style={[styles.orbSoft, styles.orbWarm]} />
        {activeSegmentKey ? (
          <View pointerEvents="none" style={styles.floatingTip}>
            <View style={[styles.floatingTipDot, { backgroundColor: activeSegment.color }]} />
            <Text style={styles.floatingTipText}>{`${activeSegment.label} ${activeSegment.percent}%`}</Text>
          </View>
        ) : null}
        <View style={styles.macroLayout}>
          <View style={styles.ringWrap}>
            <MacroDonut
              palette={palette}
              segments={segments}
              total={total}
              activeSegmentKey={activeSegmentKey}
              onActivate={(nextKey) => {
                setActiveInsightOwner(nextKey ? ownerId : null);
                setActiveSegmentKey(nextKey);
              }}
            />
            <Pressable
              style={styles.ringTouchLayer}
              hitSlop={8}
              onPress={(event) => {
                const nextKey = resolveMacroSegmentFromTouch(
                  event.nativeEvent.locationX,
                  event.nativeEvent.locationY,
                  segments,
                  total,
                );

                if (!nextKey) {
                  return;
                }

                const finalKey = activeSegmentKey === nextKey ? null : nextKey;
                setActiveInsightOwner(finalKey ? ownerId : null);
                setActiveSegmentKey(finalKey);
              }}
            />
            <View pointerEvents="none" style={styles.ringCenter}>
              <Text style={styles.ringCenterValue}>{activeSegment.percent}%</Text>
              <Text style={styles.ringCenterLabel}>{activeSegment.label}</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            {displaySegments.map((segment) => {
              const percent = Math.round((total > 0 ? segment.value / total : 0) * 100);
              const isActive = activeSegment.key === segment.key;

              return (
                <Pressable
                  key={segment.key}
                  style={[styles.legendItem, isActive && styles.legendItemActive]}
                  onPress={() => {
                    setActiveSegmentKey((current) => {
                      const nextKey = current === segment.key ? null : segment.key;
                      setActiveInsightOwner(nextKey ? ownerId : null);
                      return nextKey;
                    });
                  }}
                >
                  <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                  <View style={styles.legendTextWrap}>
                    <Text style={styles.legendLabel}>{segment.label}</Text>
                    <Text style={styles.legendValue}>{percent}%</Text>
                  </View>
                </Pressable>
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
  const ownerId = useId();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [activePointKey, setActivePointKey] = useState<string | null>(null);

  const fallbackPoint = useMemo(
    () => [...points].reverse().find((point) => point.value > 0) ?? points[points.length - 1] ?? null,
    [points],
  );
  const latest = points[points.length - 1];
  const activePoint = useMemo<ActiveCalorieInfo | null>(() => {
    const current = points.find((point) => point.key === activePointKey) ?? fallbackPoint;
    if (!current) {
      return null;
    }

    const left = 10;
    const right = 10;
    const viewBoxWidth = 180;
    const slotWidth = (viewBoxWidth - left - right) / Math.max(points.length, 1);
    const index = points.findIndex((point) => point.key === current.key);
    const centerX = left + index * slotWidth + slotWidth / 2;

    const leftPercent = (centerX / viewBoxWidth) * 100;

    return {
      key: current.key,
      label: current.label,
      value: Math.round(current.value ?? 0),
      leftPercent,
      placement: leftPercent >= 72 ? 'right' : leftPercent <= 28 ? 'left' : 'center',
    };
  }, [activePointKey, fallbackPoint, points]);
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const averageValue = points.length
    ? Math.round(points.reduce((sum, point) => sum + point.value, 0) / points.length)
    : 0;
  const firstLabel = points[0]?.label ?? '--';
  const lastLabel = latest?.label ?? '--';
  const metricValue = activePoint?.value ?? Math.round(latest?.value ?? 0);
  const metricLabel = activePoint ? activePoint.label : 'kcal';

  useEffect(() => {
    return subscribeInsightOverlay((nextOwnerId) => {
      if (nextOwnerId !== ownerId) {
        setActivePointKey(null);
      }
    });
  }, [ownerId]);

  return (
    <View style={[styles.chartCard, style]}>
      <View style={styles.chartHeaderRow}>
        <View style={styles.chartHeaderText}>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricPillValue}>{metricValue}</Text>
          <Text style={styles.metricPillLabel}>{metricLabel}</Text>
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
              {activePointKey && activePoint ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.barTooltip,
                    activePoint.placement === 'left'
                      ? styles.barTooltipLeft
                      : activePoint.placement === 'right'
                        ? styles.barTooltipRight
                        : [styles.barTooltipCenter, { left: `${activePoint.leftPercent}%` }],
                  ]}
                >
                  <Text style={styles.barTooltipText}>{`${activePoint.label} · ${activePoint.value} kcal`}</Text>
                </View>
              ) : null}
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
                  activePointKey={activePointKey}
                  onActivate={(nextKey) => {
                    setActiveInsightOwner(nextKey ? ownerId : null);
                    setActivePointKey(nextKey);
                  }}
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
  activeSegmentKey,
  onActivate,
}: {
  palette: Palette;
  segments: Segment[];
  total: number;
  activeSegmentKey: string | null;
  onActivate: (segmentKey: string | null) => void;
}) {
  const size = 96;
  const strokeWidth = 12;
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 96 96">
      <Circle cx="48" cy="48" r={radius} stroke={palette.stone100} strokeWidth={strokeWidth} fill="none" />
      {segments.map((segment) => {
        if (total <= 0 || segment.value <= 0) {
          return null;
        }

        const fraction = segment.value / total;
        const gap = Math.min(0.022, fraction * 0.22);
        const visibleFraction = Math.max(fraction - gap, 0);
        const strokeLength = circumference * visibleFraction;
        const isActive = activeSegmentKey === segment.key;
        const shouldDim = Boolean(activeSegmentKey) && !isActive;
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
            opacity={shouldDim ? 0.35 : 1}
            onPress={() => onActivate(activeSegmentKey === segment.key ? null : segment.key)}
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
  activePointKey,
  onActivate,
}: {
  averageValue: number;
  maxValue: number;
  palette: Palette;
  points: CalorieTrendBarPoint[];
  activePointKey: string | null;
  onActivate: (pointKey: string | null) => void;
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
        const isActive = activePointKey ? point.key === activePointKey : index === points.length - 1;
        const shouldDim = Boolean(activePointKey) && !isActive;
        const gradient = isActive ? 'url(#caloriesBarGradientActive)' : 'url(#caloriesBarGradient)';

        return (
          <Rect
            key={point.key}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={barWidth / 2}
            fill={gradient}
            opacity={shouldDim ? 0.45 : 1}
            onPress={() => onActivate(activePointKey === point.key ? null : point.key)}
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
      overflow: 'visible',
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
      overflow: 'visible',
      minHeight: 126,
      justifyContent: 'center',
    },
    trendPanel: {
      flex: 1,
      minHeight: 126,
      justifyContent: 'space-between',
      paddingBottom: 8,
      zIndex: 4,
    },
    trendCanvas: {
      flex: 1,
      minHeight: 92,
      justifyContent: 'flex-end',
      overflow: 'visible',
      zIndex: 5,
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
    ringTouchLayer: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 999,
      zIndex: 3,
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
    legendItemActive: {
      borderColor: palette.gold200,
      backgroundColor: palette.gold50,
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
    floatingTip: {
      position: 'absolute',
      top: -4,
      left: 10,
      right: 10,
      zIndex: 8,
      elevation: 8,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(20, 18, 16, 0.92)',
    },
    floatingTipDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    floatingTipText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.orange500,
    },
    barTooltip: {
      position: 'absolute',
      top: 2,
      zIndex: 10,
      elevation: 10,
      maxWidth: 118,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: 'rgba(20, 18, 16, 0.92)',
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    barTooltipLeft: {
      left: 8,
    },
    barTooltipCenter: {
      transform: [{ translateX: -42 }],
    },
    barTooltipRight: {
      right: 8,
    },
    barTooltipText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.orange500,
    },
  });
}
