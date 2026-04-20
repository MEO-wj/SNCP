import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ForkKnife, Sparkle } from 'phosphor-react-native';

import type { Palette } from '@/constants/palette';
import { usePalette } from '@/hooks/use-palette';

type RecipeCoverPlaceholderProps = {
  compact?: boolean;
  title?: string;
};

export function RecipeCoverPlaceholder({ compact = false, title = '今日食谱' }: RecipeCoverPlaceholderProps) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette, compact), [palette, compact]);

  return (
    <View style={styles.shell}>
      <LinearGradient colors={[palette.gold50, palette.warm100]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={styles.orbLarge} />
      <View style={styles.orbSmall} />
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Sparkle size={12} color={palette.orange500} weight="fill" />
          <Text style={styles.badgeText}>默认封面</Text>
        </View>
      </View>
      <View style={styles.centerIcon}>
        <ForkKnife size={compact ? 26 : 34} color={palette.orange500} weight="duotone" />
      </View>
      <View style={styles.bottomArea}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle}>待添加配图时显示</Text>
      </View>
    </View>
  );
}

function createStyles(palette: Palette, compact: boolean) {
  return StyleSheet.create({
    shell: {
      overflow: 'hidden',
      borderRadius: 18,
      height: compact ? 112 : 220,
      backgroundColor: palette.gold50,
      position: 'relative',
      justifyContent: 'space-between',
    },
    orbLarge: {
      position: 'absolute',
      width: compact ? 112 : 160,
      height: compact ? 112 : 160,
      borderRadius: 999,
      backgroundColor: palette.white,
      opacity: 0.7,
      top: compact ? -34 : -42,
      right: compact ? -22 : -28,
    },
    orbSmall: {
      position: 'absolute',
      width: compact ? 84 : 110,
      height: compact ? 84 : 110,
      borderRadius: 999,
      backgroundColor: palette.gold100,
      opacity: 0.9,
      bottom: compact ? -28 : -30,
      left: compact ? -18 : -16,
    },
    topRow: {
      paddingHorizontal: 12,
      paddingTop: 12,
    },
    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: palette.white,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: palette.orange500,
    },
    centerIcon: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: compact ? -8 : -16,
    },
    bottomArea: {
      paddingHorizontal: 12,
      paddingBottom: 12,
      gap: 2,
    },
    title: {
      fontSize: compact ? 14 : 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    subtitle: {
      fontSize: compact ? 11 : 12,
      color: palette.stone600,
    },
  });
}
