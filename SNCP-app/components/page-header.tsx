import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft } from 'phosphor-react-native';

import type { Palette } from '@/constants/palette';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';

type PageHeaderProps = {
  title: string;
  subtitle: string;
  backLabel?: string;
  eyebrow?: string;
  onBack: () => void;
};

export function PageHeader({
  title,
  subtitle,
  backLabel = '返回',
  eyebrow,
  onBack,
}: PageHeaderProps) {
  const palette = usePalette();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = useMemo(() => createStyles(palette, isDark), [isDark, palette]);

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.backButton} onPress={onBack}>
        <ArrowLeft size={16} color={palette.stone800} weight="bold" />
        <Text style={styles.backButtonText}>{backLabel}</Text>
      </Pressable>

      {eyebrow ? (
        <View style={styles.eyebrowPill}>
          <Text style={styles.eyebrowText}>{eyebrow}</Text>
        </View>
      ) : null}

      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function createStyles(palette: Palette, isDark: boolean) {
  const panelSurface = isDark ? 'rgba(28, 26, 24, 0.9)' : 'rgba(255, 248, 241, 0.86)';
  const panelBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(229, 211, 194, 0.72)';
  const backSurface = isDark ? 'rgba(255,255,255,0.06)' : palette.white;
  const backBorder = isDark ? 'rgba(255,255,255,0.08)' : palette.gold100;
  const eyebrowSurface = isDark ? 'rgba(255, 140, 66, 0.12)' : palette.gold50;
  const eyebrowBorder = isDark ? 'rgba(255, 140, 66, 0.18)' : palette.gold100;

  return StyleSheet.create({
    wrap: {
      borderRadius: 24,
      padding: 18,
      gap: 12,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    backButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: backSurface,
      borderWidth: 1,
      borderColor: backBorder,
    },
    backButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone800,
    },
    eyebrowPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: eyebrowSurface,
      borderWidth: 1,
      borderColor: eyebrowBorder,
    },
    eyebrowText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.orange500,
    },
    textWrap: {
      gap: 8,
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      color: palette.stone900,
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone600,
    },
  });
}
