import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChartLineUp, House, Sparkle, User, Camera } from 'phosphor-react-native';

import { shadows } from '@/constants/shadows';
import type { Palette } from '@/constants/palette';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';

type DockTab = 'home' | 'record' | 'recommend' | 'trend' | 'profile';

type BottomDockProps = {
  activeTab: DockTab;
  onHome: () => void;
  onRecord: () => void;
  onRecommend: () => void;
  onTrend: () => void;
  onProfile: () => void;
};

export function BottomDock({
  activeTab,
  onHome,
  onRecord,
  onRecommend,
  onTrend,
  onProfile,
}: BottomDockProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette, isDark), [isDark, palette]);

  return (
    <View pointerEvents="box-none" style={styles.dockWrap}>
      <BlurView intensity={60} tint={colorScheme === 'dark' ? 'dark' : 'light'} style={styles.dock}>
        <Pressable
          style={[styles.dockButton, activeTab === 'home' && styles.dockButtonHome]}
          onPress={onHome}
        >
          <House
            size={22}
            color={activeTab === 'home' ? palette.orange500 : palette.stone400}
            weight={activeTab === 'home' ? 'fill' : 'bold'}
          />
          <Text style={[styles.dockLabel, activeTab === 'home' && styles.dockLabelActive]}>
            首页
          </Text>
        </Pressable>
        <Pressable
          style={[styles.dockButton, activeTab === 'record' && styles.dockButtonRecord]}
          onPress={onRecord}
        >
          <Camera
            size={22}
            color={activeTab === 'record' ? palette.green500 : palette.stone400}
            weight={activeTab === 'record' ? 'fill' : 'bold'}
          />
          <Text style={[styles.dockLabel, activeTab === 'record' && styles.dockLabelActive]}>
            记录
          </Text>
        </Pressable>
        <Pressable
          style={[styles.dockButton, activeTab === 'recommend' && styles.dockButtonRecommend]}
          onPress={onRecommend}
        >
          <Sparkle
            size={22}
            color={activeTab === 'recommend' ? palette.orange500 : palette.stone400}
            weight={activeTab === 'recommend' ? 'fill' : 'bold'}
          />
          <Text style={[styles.dockLabel, activeTab === 'recommend' && styles.dockLabelActive]}>
            推荐
          </Text>
        </Pressable>
        <Pressable
          style={[styles.dockButton, activeTab === 'trend' && styles.dockButtonTrend]}
          onPress={onTrend}
        >
          <ChartLineUp
            size={22}
            color={activeTab === 'trend' ? palette.blue500 : palette.stone400}
            weight={activeTab === 'trend' ? 'fill' : 'bold'}
          />
          <Text style={[styles.dockLabel, activeTab === 'trend' && styles.dockLabelActive]}>
            趋势
          </Text>
        </Pressable>
        <Pressable
          style={[styles.dockButton, activeTab === 'profile' && styles.dockButtonProfile]}
          onPress={onProfile}
        >
          <User
            size={22}
            color={activeTab === 'profile' ? palette.stone800 : palette.stone400}
            weight={activeTab === 'profile' ? 'fill' : 'bold'}
          />
          <Text style={[styles.dockLabel, activeTab === 'profile' && styles.dockLabelActive]}>
            我的
          </Text>
        </Pressable>
      </BlurView>
    </View>
  );
}

function createStyles(colors: Palette, isDark: boolean) {
  return StyleSheet.create({
  dockWrap: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20, 
  },
  dock: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 14,
    backgroundColor: isDark ? 'rgba(24, 22, 20, 0.9)' : colors.white,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : colors.stone100,
    overflow: 'hidden', 
    ...shadows.dock,
  },
  dockButton: {
    width: 54,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dockButtonHome: {
    backgroundColor: isDark ? 'rgba(255, 140, 66, 0.14)' : colors.gold50,
    ...shadows.glowGold,
  },
  dockButtonRecord: {
    backgroundColor: isDark ? 'rgba(76, 175, 80, 0.16)' : colors.warm100,
  },
  dockButtonRecommend: {
    backgroundColor: isDark ? 'rgba(255, 140, 66, 0.14)' : colors.gold50,
  },
  dockButtonTrend: {
    backgroundColor: isDark ? 'rgba(106, 142, 174, 0.18)' : colors.rose100,
  },
  dockButtonProfile: {
    backgroundColor: isDark ? colors.stone200 : colors.stone100,
    ...shadows.glowStone,
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.stone500,
  },
  dockLabelActive: {
    color: colors.stone800,
  },
  });
}
