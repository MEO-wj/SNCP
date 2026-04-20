import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { PencilSimpleLine, Phone } from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { colors, Palette } from '@/constants/palette';
import { setAuthToken, useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { useUserProfile } from '@/hooks/use-user-profile';
import { clearAuthStorage, getUserProfileRaw } from '@/storage/auth-storage';
import { getThemePreference, setThemePreference as saveThemePreference, type ThemePreference } from '@/storage/theme-storage';
import { fetchGoals, fetchProfile } from '@/services/profile';
import type { HealthProfile, NutritionGoals } from '@/types/profile';

export default function SettingsScreen() {
  const router = useRouter();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const token = useAuthToken();
  const userProfile = useUserProfile();
  const [cachedUserProfile, setCachedUserProfile] = useState<{
    display_name?: string;
    phone?: string;
    roles?: string[];
  } | null>(null);
  const activeUserProfile = cachedUserProfile || userProfile;
  const isAdmin = (activeUserProfile?.roles || []).includes('admin');

  const [profile, setProfile] = useState<HealthProfile>({});
  const [goals, setGoals] = useState<NutritionGoals>({});
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  const loadProfileAndGoals = useCallback(() => {
    if (!token) {
      return;
    }
    fetchProfile(token)
      .then((res) => setProfile(res.profile || {}))
      .catch(() => {});
    fetchGoals(token)
      .then((res) => setGoals(res.goals || {}))
      .catch(() => {});
  }, [token]);

  const loadCachedUserProfile = useCallback(() => {
    void getUserProfileRaw().then((value) => {
      try {
        const parsed = value ? (JSON.parse(value) as { display_name?: string; phone?: string; roles?: string[] }) : null;
        setCachedUserProfile(parsed);
      } catch {
        setCachedUserProfile(null);
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfileAndGoals();
      loadCachedUserProfile();
    }, [loadCachedUserProfile, loadProfileAndGoals]),
  );

  useEffect(() => {
    let mounted = true;
    void getThemePreference().then((nextPreference) => {
      if (mounted) {
        setThemePreference(nextPreference);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleThemeChange = (preference: ThemePreference) => {
    setThemePreference(preference);
    void saveThemePreference(preference);
  };

  const themeOptions: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: '跟随系统' },
    { value: 'light', label: '日间' },
    { value: 'dark', label: '夜间' },
  ];

  const healthSummary = useMemo(() => {
    const values = [
      profile.gender ? `性别 ${profile.gender}` : '',
      profile.birth_year ? `${profile.birth_year}年生` : '',
      profile.height_cm ? `${profile.height_cm}cm` : '',
      profile.weight_kg ? `${profile.weight_kg}kg` : '',
      (profile.chronic_conditions || []).length > 0 ? `慢性病 ${(profile.chronic_conditions || []).join('、')}` : '',
    ].filter(Boolean);
    return values.length > 0 ? values.join(' · ') : '未完善，点击填写';
  }, [profile]);

  const goalsSummary = useMemo(() => {
    const formatRange = (min?: number | null, max?: number | null, unit?: string) => {
      const hasMin = min !== null && min !== undefined;
      const hasMax = max !== null && max !== undefined;
      if (!hasMin && !hasMax) {
        return '';
      }
      const low = hasMin ? String(min) : '--';
      const high = hasMax ? String(max) : '--';
      return `${low}-${high}${unit || ''}`;
    };
    const calories = formatRange(goals.calories_min, goals.calories_max, 'kcal');
    const protein = formatRange(goals.protein_min, goals.protein_max, 'g');
    const values = [
      calories ? `热量 ${calories}` : '',
      protein ? `蛋白 ${protein}` : '',
    ].filter(Boolean);
    return values.length > 0 ? values.join(' · ') : '未设置，点击填写';
  }, [goals]);

  const displayName = activeUserProfile?.display_name || '未设置昵称';
  const displayPhone = activeUserProfile?.phone || '--';
  const avatarSeed = (activeUserProfile?.display_name || activeUserProfile?.phone || '我').trim();
  const avatarText = avatarSeed.slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await clearAuthStorage();
    await setAuthToken(null);
    router.replace('/login');
  };

  const handleOpenAccountEditor = () => {
    router.push('/settings/account');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>我的</Text>
        <View style={[styles.card, styles.accountCard]}>
          <View style={styles.accountHero}>
            <View style={styles.accountHeroMain}>
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>{avatarText}</Text>
              </View>
              <View style={styles.accountHeroTextGroup}>
                <Text style={styles.accountHeroTitle} numberOfLines={1}>
                  {displayName}
                </Text>
                <Text style={styles.accountHeroSubtitle}>个人健康档案</Text>
              </View>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.accountEditIconButton,
                pressed && styles.accountEditIconButtonPressed,
              ]}
              onPress={handleOpenAccountEditor}
              accessibilityRole="button"
              accessibilityLabel="编辑个人信息"
              hitSlop={10}
            >
              <PencilSimpleLine size={16} color={palette.stone800} weight="bold" />
            </Pressable>
          </View>
          <View style={styles.accountInfoGrid}>
            <View style={styles.accountInfoChip}>
              <View style={styles.accountInfoHead}>
                <Phone size={14} color={palette.stone600} weight="bold" />
                <Text style={styles.metaLabel}>已绑定手机号</Text>
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {displayPhone}
              </Text>
            </View>
          </View>
          <View style={styles.accountPatternRow}>
            <View style={[styles.accountPatternBar, styles.accountPatternBarShort]} />
            <View style={styles.accountPatternDot} />
            <View style={[styles.accountPatternBar, styles.accountPatternBarLong]} />
            <View style={styles.accountPatternCenterDot} />
            <View style={[styles.accountPatternBar, styles.accountPatternBarLong]} />
            <View style={styles.accountPatternDot} />
            <View style={[styles.accountPatternBar, styles.accountPatternBarShort]} />
          </View>
        </View>

        <Pressable
          style={[styles.entryCard, styles.healthEntryCard]}
          onPress={() => router.push('/settings/profile')}
        >
          <View style={styles.entryHead}>
            <View style={styles.entryTitleGroup}>
              <View style={[styles.entryPill, styles.healthPill]}>
                <Text style={styles.entryPillText}>健康</Text>
              </View>
              <Text style={styles.cardTitle}>健康档案</Text>
            </View>
            <Text style={styles.entryArrow}>›</Text>
          </View>
          <Text style={styles.entrySummary} numberOfLines={2}>
            {healthSummary}
          </Text>
          <Text style={styles.entryHint}>点击进入填写</Text>
        </Pressable>

        <Pressable
          style={[styles.entryCard, styles.goalsEntryCard]}
          onPress={() => router.push('/settings/goals')}
        >
          <View style={styles.entryHead}>
            <View style={styles.entryTitleGroup}>
              <View style={[styles.entryPill, styles.goalsPill]}>
                <Text style={styles.entryPillText}>目标</Text>
              </View>
              <Text style={styles.cardTitle}>营养目标</Text>
            </View>
            <Text style={styles.entryArrow}>›</Text>
          </View>
          <Text style={styles.entrySummary} numberOfLines={2}>
            {goalsSummary}
          </Text>
          <Text style={styles.entryHint}>点击进入填写</Text>
        </Pressable>

        <View style={[styles.card, styles.themeCard]}>
          <Text style={styles.cardTitle}>日夜间模式</Text>
          <View style={styles.themeRow}>
            {themeOptions.map((option) => {
              const isActive = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.themeButton, isActive && styles.themeButtonActive]}
                  onPress={() => handleThemeChange(option.value)}
                >
                  <Text style={[styles.themeButtonText, isActive && styles.themeButtonTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, styles.featureCard]}>
          <Text style={styles.cardTitle}>功能入口</Text>
          <Pressable style={styles.linkButton} onPress={() => router.push('/reminders')}>
            <Text style={styles.linkButtonText}>提醒设置</Text>
            <Text style={styles.linkArrow}>›</Text>
          </Pressable>
          {isAdmin && (
            <>
              <Pressable style={styles.linkButton} onPress={() => router.push('/admin/health-rules')}>
                <Text style={styles.linkButtonText}>管理健康禁忌</Text>
                <Text style={styles.linkArrow}>›</Text>
              </Pressable>
              <Pressable style={styles.linkButton} onPress={() => router.push('/admin/recipes')}>
                <Text style={styles.linkButtonText}>管理食谱库</Text>
                <Text style={styles.linkArrow}>›</Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </ScrollView>
      <BottomDock
        activeTab="profile"
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
    pageTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: palette.stone900,
      marginBottom: 4,
    },
    card: {
      backgroundColor: palette.white,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 10,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    accountCard: {
      gap: 12,
    },
    themeCard: {
      borderColor: palette.stone100,
    },
    featureCard: {
      borderColor: palette.stone100,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: palette.stone800,
    },
    accountHero: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
      paddingVertical: 4,
    },
    accountHeroMain: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 10,
    },
    accountEditIconButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.white,
      borderWidth: 1,
      borderColor: palette.stone200,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      alignSelf: 'center',
    },
    accountEditIconButtonPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.97 }],
    },
    accountAvatar: {
      width: 64,
      height: 64,
      borderRadius: 999,
      backgroundColor: palette.surfaceWarm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountAvatarText: {
      fontSize: 24,
      fontWeight: '800',
      color: palette.stone800,
    },
    accountHeroTextGroup: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
      gap: 2,
    },
    accountHeroTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: palette.stone850,
    },
    accountHeroSubtitle: {
      fontSize: 12,
      color: palette.stone500,
      fontWeight: '600',
    },
    accountInfoGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    accountInfoChip: {
      flex: 1,
      gap: 6,
      backgroundColor: palette.white,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: palette.stone100,
    },
    accountInfoHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    accountPatternRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      opacity: 0.72,
      paddingHorizontal: 4,
    },
    accountPatternBar: {
      height: 6,
      borderRadius: 999,
      backgroundColor: palette.stone300,
    },
    accountPatternBarLong: {
      width: 44,
    },
    accountPatternBarShort: {
      width: 24,
    },
    accountPatternDot: {
      width: 5,
      height: 5,
      borderRadius: 999,
      backgroundColor: palette.stone400,
      opacity: 0.9,
    },
    accountPatternCenterDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      backgroundColor: palette.stone500,
      opacity: 0.9,
    },
    metaLabel: {
      fontSize: 12,
      color: palette.stone500,
      fontWeight: '600',
    },
    metaText: {
      fontSize: 14,
      color: palette.stone700,
      fontWeight: '700',
    },
    entryCard: {
      backgroundColor: palette.white,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 8,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    healthEntryCard: {
      borderColor: palette.stone100,
    },
    goalsEntryCard: {
      borderColor: palette.stone100,
    },
    entryHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    entryTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    entryPill: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    healthPill: {
      backgroundColor: palette.gold100,
    },
    goalsPill: {
      backgroundColor: palette.warm100,
    },
    entryPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.stone700,
    },
    entryArrow: {
      color: palette.stone400,
      fontSize: 22,
      fontWeight: '500',
      lineHeight: 22,
    },
    entrySummary: {
      fontSize: 14,
      color: palette.stone700,
      lineHeight: 20,
    },
    entryHint: {
      fontSize: 12,
      color: palette.stone500,
      fontWeight: '600',
    },
    themeRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.stone100,
    },
    themeButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeButtonActive: {
      backgroundColor: palette.stone900,
    },
    themeButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone600,
    },
    themeButtonTextActive: {
      color: palette.white,
    },
    linkButton: {
      backgroundColor: palette.white,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: palette.stone100,
    },
    linkButtonText: {
      color: palette.stone700,
      fontSize: 14,
      fontWeight: '600',
    },
    linkArrow: {
      color: palette.stone400,
      fontSize: 20,
      fontWeight: '500',
      lineHeight: 20,
    },
    logoutButton: {
      backgroundColor: palette.imperial100,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.imperial400,
    },
    logoutText: {
      color: palette.imperial600,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
