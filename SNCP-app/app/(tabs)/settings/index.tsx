import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  CaretRight,
  CheckCircle,
  Desktop,
  Fire,
  ForkKnife,
  Heartbeat,
  Moon,
  PencilSimpleLine,
  Phone,
  Ruler,
  Scales,
  SquaresFour,
  SunDim,
  TagSimple,
  Target,
} from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import {
  formatNutritionGoalRange,
  getDefaultNutritionGoalsSummary,
  hasConfiguredNutritionGoals,
} from '@/constants/nutrition-goals';
import { colors, Palette } from '@/constants/palette';
import { setAuthToken, useAuthToken } from '@/hooks/use-auth-token';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';
import { useUserProfile } from '@/hooks/use-user-profile';
import { clearAuthStorage, getUserProfileRaw } from '@/storage/auth-storage';
import { getThemePreference, setThemePreference as saveThemePreference, type ThemePreference } from '@/storage/theme-storage';
import { fetchMyAccount } from '@/services/account';
import { reportLogoutActivityIfNeeded } from '@/services/activity';
import { fetchGoals, fetchProfile } from '@/services/profile';
import type { HealthProfile, NutritionGoals } from '@/types/profile';

const NO_CHRONIC_DISEASE_LABEL = '无慢性病';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const token = useAuthToken();
  const userProfile = useUserProfile();
  const appVersion = String(Constants.expoConfig?.version || '未知版本');
  const [cachedUserProfile, setCachedUserProfile] = useState<{
    id?: string;
    display_name?: string;
    phone?: string;
    roles?: string[];
    avatar_url?: string | null;
  } | null>(null);
  const activeUserProfile = cachedUserProfile || userProfile;
  const roleSet = new Set(activeUserProfile?.roles || []);
  const isAdmin = roleSet.has('admin') || roleSet.has('webmaster');

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
        const parsed = value
          ? (JSON.parse(value) as {
              id?: string;
              display_name?: string;
              phone?: string;
              roles?: string[];
              avatar_url?: string | null;
            })
          : null;
        setCachedUserProfile(parsed);
      } catch {
        setCachedUserProfile(null);
      }
    });
  }, []);

  const loadAccountProfile = useCallback(() => {
    if (!token) {
      return;
    }
    fetchMyAccount(token)
      .then((account) => {
        setCachedUserProfile({
          id: account.user_id,
          display_name: account.display_name,
          phone: account.phone,
          roles: account.roles || [],
          avatar_url: account.avatar_url || null,
        });
      })
      .catch(() => {});
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadProfileAndGoals();
      loadCachedUserProfile();
      loadAccountProfile();
    }, [loadAccountProfile, loadCachedUserProfile, loadProfileAndGoals]),
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

  const themeOptions: {
    value: ThemePreference;
    label: string;
    description: string;
    icon: typeof Desktop;
  }[] = [
    { value: 'system', label: '跟随系统', description: '自动同步设备', icon: Desktop },
    { value: 'light', label: '日间', description: '明亮清爽视觉', icon: SunDim },
    { value: 'dark', label: '夜间', description: '沉浸深暗氛围', icon: Moon },
  ];

  const isThemePanelDark = themePreference === 'dark' || (themePreference === 'system' && colorScheme === 'dark');
  const themePanelColors = useMemo(
    () =>
      isThemePanelDark
        ? {
            cardBackground: '#151311',
            cardBorder: 'rgba(255,255,255,0.06)',
            title: '#FFF8F2',
            subtitle: 'rgba(255,255,255,0.68)',
            titleBadgeBackground: 'rgba(255, 149, 0, 0.14)',
            titleBadgeBorder: 'rgba(255, 149, 0, 0.28)',
            rowBackground: 'rgba(255,255,255,0.04)',
            rowBorder: 'rgba(255,255,255,0.08)',
            livePillBackground: 'rgba(255,255,255,0.08)',
            livePillBorder: 'rgba(255,255,255,0.08)',
            liveText: '#FFF8F2',
            buttonBackground: 'rgba(255,255,255,0.03)',
            buttonActiveBackground: 'rgba(255,255,255,0.12)',
            buttonActiveBorder: 'rgba(255,255,255,0.16)',
            buttonText: '#FFF8F2',
            buttonDescription: 'rgba(255,255,255,0.58)',
            buttonDescriptionActive: 'rgba(255,255,255,0.82)',
            iconBackground: 'rgba(255,255,255,0.08)',
            iconBorder: 'rgba(255,255,255,0.08)',
            inactiveIcon: palette.stone700,
            glowBackground: 'rgba(255,255,255,0.06)',
            glowActiveBackground: 'rgba(255, 159, 67, 0.24)',
            indicator: 'rgba(255,255,255,0.16)',
          }
        : {
            cardBackground: '#FFF7F0',
            cardBorder: palette.gold100,
            title: palette.stone850,
            subtitle: palette.stone600,
            titleBadgeBackground: '#FFE8D0',
            titleBadgeBorder: '#FFD4AC',
            rowBackground: '#FBECDD',
            rowBorder: '#F3D9BB',
            livePillBackground: '#FFF1E4',
            livePillBorder: '#FFDDBA',
            liveText: palette.stone800,
            buttonBackground: 'rgba(255,255,255,0.72)',
            buttonActiveBackground: '#FFFDF9',
            buttonActiveBorder: '#FFB97A',
            buttonText: palette.stone850,
            buttonDescription: palette.stone500,
            buttonDescriptionActive: palette.stone700,
            iconBackground: '#FFF4E8',
            iconBorder: '#F5D8B6',
            inactiveIcon: palette.stone600,
            glowBackground: 'rgba(255, 201, 150, 0.28)',
            glowActiveBackground: 'rgba(255, 159, 67, 0.2)',
            indicator: 'rgba(81, 74, 70, 0.18)',
          },
    [isThemePanelDark, palette.gold100, palette.stone500, palette.stone600, palette.stone700, palette.stone800, palette.stone850],
  );

  const healthSummary = useMemo(() => {
    const chronicConditions = (profile.chronic_conditions || []).filter(Boolean);
    const hasNoChronicDisease = chronicConditions.includes(NO_CHRONIC_DISEASE_LABEL);
    const chronicConditionItems = chronicConditions.filter((item) => item !== NO_CHRONIC_DISEASE_LABEL);
    const values = [
      profile.gender ? `性别 ${profile.gender}` : '',
      profile.birth_year ? `${profile.birth_year}年生` : '',
      profile.height_cm ? `${profile.height_cm}cm` : '',
      profile.weight_kg ? `${profile.weight_kg}kg` : '',
      chronicConditions.length > 0 ? (hasNoChronicDisease ? NO_CHRONIC_DISEASE_LABEL : chronicConditionItems.join('、')) : '',
    ].filter(Boolean);
    return values.length > 0 ? values.join(' · ') : '未完善，点击填写';
  }, [profile]);

  const goalsSummary = useMemo(() => {
    const calories = formatNutritionGoalRange(goals.calories_min, goals.calories_max, 'kcal');
    const protein = formatNutritionGoalRange(goals.protein_min, goals.protein_max, 'g');
    const values = [
      calories ? `热量 ${calories}` : '',
      protein ? `蛋白 ${protein}` : '',
    ].filter(Boolean);
    return values.length > 0 ? values.join(' · ') : `默认建议：${getDefaultNutritionGoalsSummary()}`;
  }, [goals]);

  const hasCustomGoals = useMemo(() => hasConfiguredNutritionGoals(goals), [goals]);
  const healthMetricChips = useMemo(
    () => {
      const chronicConditions = (profile.chronic_conditions || []).filter(Boolean);
      const hasNoChronicDisease = chronicConditions.includes(NO_CHRONIC_DISEASE_LABEL);
      const chronicConditionItems = chronicConditions.filter((item) => item !== NO_CHRONIC_DISEASE_LABEL);
      return [
        { key: 'height', label: '身高', value: profile.height_cm ? `${profile.height_cm}cm` : '待填', icon: Ruler },
        { key: 'weight', label: '体重', value: profile.weight_kg ? `${profile.weight_kg}kg` : '待填', icon: Scales },
        {
          key: 'condition',
          label: '慢病',
          value: hasNoChronicDisease ? '无' : chronicConditionItems.length > 0 ? `${chronicConditionItems.length} 项` : '未记录',
          icon: Heartbeat,
        },
      ];
    },
    [profile],
  );
  const goalMetricChips = useMemo(
    () => [
      {
        key: 'calories',
        label: '热量',
        value: formatNutritionGoalRange(goals.calories_min, goals.calories_max, 'kcal') || '默认',
        icon: Fire,
      },
      {
        key: 'protein',
        label: '蛋白',
        value: formatNutritionGoalRange(goals.protein_min, goals.protein_max, 'g') || '默认',
        icon: ForkKnife,
      },
      {
        key: 'status',
        label: '状态',
        value: hasCustomGoals ? '已设置' : '推荐值',
        icon: CheckCircle,
      },
    ],
    [goals, hasCustomGoals],
  );

  const displayName = activeUserProfile?.display_name || '未设置昵称';
  const displayPhone = activeUserProfile?.phone || '--';
  const avatarUrl = activeUserProfile?.avatar_url || null;
  const avatarSeed = (activeUserProfile?.display_name || activeUserProfile?.phone || '我').trim();
  const avatarText = avatarSeed.slice(0, 1).toUpperCase();
  const accountRoleMeta = roleSet.has('webmaster')
    ? {
        label: '站长',
        textColor: palette.imperial600,
        backgroundColor: palette.imperial50,
        borderColor: palette.imperial100,
      }
    : roleSet.has('admin')
    ? {
        label: '管理员',
        textColor: palette.gold600,
        backgroundColor: palette.gold50,
        borderColor: palette.gold200,
      }
    : {
        label: '成员',
        textColor: palette.stone600,
        backgroundColor: palette.stone100,
        borderColor: palette.stone200,
      };

  const handleLogout = async () => {
    await reportLogoutActivityIfNeeded(token);
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
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.accountAvatarImage} contentFit="cover" />
                ) : (
                  <Text style={styles.accountAvatarText}>{avatarText}</Text>
                )}
                <View style={styles.accountAvatarBadge}>
                  <CheckCircle size={13} color={palette.white} weight="fill" />
                </View>
              </View>
              <View style={styles.accountHeroTextGroup}>
                <View style={styles.accountHeroTitleRow}>
                  <Text style={styles.accountHeroTitle} numberOfLines={1}>
                    {displayName}
                  </Text>
                  <View
                    style={[
                      styles.accountRoleBadge,
                      {
                        backgroundColor: accountRoleMeta.backgroundColor,
                        borderColor: accountRoleMeta.borderColor,
                      },
                    ]}
                  >
                    <Text style={[styles.accountRoleBadgeText, { color: accountRoleMeta.textColor }]}>
                      {accountRoleMeta.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.accountHeroBadge}>
                  <CheckCircle size={13} color={palette.orange500} weight="fill" />
                  <Text style={styles.accountHeroSubtitle}>账号信息</Text>
                </View>
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
            <View style={[styles.accountInfoChip, styles.accountInfoChipWide]}>
              <View style={styles.accountInfoHead}>
                <View style={styles.accountInfoIcon}>
                  <Phone size={14} color={palette.orange500} weight="bold" />
                </View>
                <Text style={styles.metaLabel}>已绑定手机号</Text>
              </View>
              <Text style={styles.metaText} numberOfLines={1}>
                {displayPhone}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={[styles.entryCard, styles.healthEntryCard]}
          onPress={() => router.push('/settings/profile')}
        >
          <View style={styles.entryHead}>
            <View style={styles.entryTitleGroup}>
              <View style={[styles.entryIconBadge, styles.healthIconBadge]}>
                <Heartbeat size={18} color={palette.orange500} weight="fill" />
              </View>
              <View style={styles.entryTitleTextGroup}>
                <Text style={styles.cardTitle}>健康档案</Text>
                <Text style={styles.entryOverline}>个人基础信息</Text>
              </View>
            </View>
            <CaretRight size={18} color={palette.stone400} weight="bold" />
          </View>
          <Text style={styles.entrySummary} numberOfLines={2}>
            {healthSummary}
          </Text>
          <View style={styles.entryMetricGrid}>
            {healthMetricChips.map((item) => {
              const Icon = item.icon;
              return (
                <View key={item.key} style={styles.entryMetricChip}>
                  <Icon size={16} color={palette.orange500} weight="bold" />
                  <View style={styles.entryMetricTextGroup}>
                    <Text style={styles.entryMetricLabel}>{item.label}</Text>
                    <Text style={styles.entryMetricValue} numberOfLines={1}>{item.value}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.entryFooter}>
            <View style={[styles.statusDot, styles.healthStatusDot]} />
            <Text style={styles.entryHint}>点击进入填写</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.entryCard, styles.goalsEntryCard]}
          onPress={() => router.push('/settings/goals')}
        >
          <View style={styles.entryHead}>
            <View style={styles.entryTitleGroup}>
              <View style={[styles.entryIconBadge, styles.goalsIconBadge]}>
                <Target size={18} color={palette.green500} weight="fill" />
              </View>
              <View style={styles.entryTitleTextGroup}>
                <Text style={styles.cardTitle}>营养目标</Text>
                <Text style={styles.entryOverline}>每日摄入范围</Text>
              </View>
            </View>
            <CaretRight size={18} color={palette.stone400} weight="bold" />
          </View>
          <Text style={styles.entrySummary} numberOfLines={2}>
            {goalsSummary}
          </Text>
          <View style={styles.entryMetricGrid}>
            {goalMetricChips.map((item) => {
              const Icon = item.icon;
              return (
                <View key={item.key} style={styles.entryMetricChip}>
                  <Icon size={16} color={palette.green500} weight="bold" />
                  <View style={styles.entryMetricTextGroup}>
                    <Text style={styles.entryMetricLabel}>{item.label}</Text>
                    <Text style={styles.entryMetricValue} numberOfLines={1}>{item.value}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={styles.entryFooter}>
            <View style={[styles.statusDot, hasCustomGoals ? styles.goalsStatusDot : styles.pendingStatusDot]} />
            <Text style={styles.entryHint}>
              {hasCustomGoals ? '点击进入填写' : '未设置时会显示默认建议'}
            </Text>
          </View>
        </Pressable>

        <View
          style={[
            styles.card,
            styles.themeCard,
            { backgroundColor: themePanelColors.cardBackground, borderColor: themePanelColors.cardBorder },
          ]}
        >
          <View style={styles.themeHeader}>
            <View style={styles.themeTitleGroup}>
              <View
                style={[
                  styles.themeTitleBadge,
                  {
                    backgroundColor: themePanelColors.titleBadgeBackground,
                    borderColor: themePanelColors.titleBadgeBorder,
                  },
                ]}
              >
                <Moon size={18} color={palette.orange500} weight="fill" />
              </View>
              <View style={styles.themeTitleTextGroup}>
                <Text style={[styles.cardTitle, styles.themeCardTitle, { color: themePanelColors.title }]}>日夜间模式</Text>
                <Text style={[styles.themeSubtitle, { color: themePanelColors.subtitle }]}>切换专属氛围，让设置也更有仪式感</Text>
              </View>
            </View>
            <View
              style={[
                styles.themeLivePill,
                {
                  backgroundColor: themePanelColors.livePillBackground,
                  borderColor: themePanelColors.livePillBorder,
                },
              ]}
            >
              <View style={styles.themeLiveDot} />
              <Text style={[styles.themeLiveText, { color: themePanelColors.liveText }]}>
                当前：{themeOptions.find((option) => option.value === themePreference)?.label || '跟随系统'}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.themeRow,
              {
                backgroundColor: themePanelColors.rowBackground,
                borderColor: themePanelColors.rowBorder,
              },
            ]}
          >
            {themeOptions.map((option) => {
              const isActive = themePreference === option.value;
              const Icon = option.icon;
              return (
                <Pressable
                  key={option.value}
                  style={({ pressed }) => [
                    styles.themeButton,
                    { backgroundColor: themePanelColors.buttonBackground },
                    isActive && styles.themeButtonActive,
                    pressed && styles.themeButtonPressed,
                    isActive && {
                      backgroundColor: themePanelColors.buttonActiveBackground,
                      borderColor: themePanelColors.buttonActiveBorder,
                    },
                  ]}
                  onPress={() => handleThemeChange(option.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`切换到${option.label}模式`}
                >
                  <View
                    style={[
                      styles.themeButtonGlow,
                      { backgroundColor: themePanelColors.glowBackground },
                      isActive && styles.themeButtonGlowActive,
                      isActive && { backgroundColor: themePanelColors.glowActiveBackground },
                    ]}
                  />
                  <View
                    style={[
                      styles.themeIconWrap,
                      {
                        backgroundColor: themePanelColors.iconBackground,
                        borderColor: themePanelColors.iconBorder,
                      },
                      isActive && styles.themeIconWrapActive,
                    ]}
                  >
                    <Icon
                      size={20}
                      color={isActive ? '#FFF8F2' : themePanelColors.inactiveIcon}
                      weight={isActive ? 'fill' : 'bold'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.themeButtonText,
                      { color: themePanelColors.buttonText },
                      isActive && styles.themeButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.themeButtonDescription,
                      { color: themePanelColors.buttonDescription },
                      isActive && styles.themeButtonDescriptionActive,
                      isActive && { color: themePanelColors.buttonDescriptionActive },
                    ]}
                  >
                    {option.description}
                  </Text>
                  <View
                    style={[
                      styles.themeButtonIndicator,
                      { backgroundColor: themePanelColors.indicator },
                      isActive && styles.themeButtonIndicatorActive,
                    ]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.card, styles.featureCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <View style={styles.sectionIconBadge}>
                <SquaresFour size={18} color={palette.orange500} weight="fill" />
              </View>
              <Text style={styles.cardTitle}>功能入口</Text>
            </View>
          </View>
          <Pressable style={styles.linkButton} onPress={() => router.push('/reminders')}>
            <Text style={styles.linkButtonText}>提醒设置</Text>
            <Text style={styles.linkArrow}>›</Text>
          </Pressable>
          {isAdmin && (
            <>
              <Pressable style={styles.linkButton} onPress={() => router.push('/admin/health-rules')}>
                <Text style={styles.linkButtonText}>后台数据管理</Text>
                <Text style={styles.linkArrow}>›</Text>
              </Pressable>
              <Pressable style={styles.linkButton} onPress={() => router.push('/admin/recipes')}>
                <Text style={styles.linkButtonText}>管理食谱库</Text>
                <Text style={styles.linkArrow}>›</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={[styles.card, styles.versionCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleGroup}>
              <View style={styles.sectionIconBadge}>
                <TagSimple size={18} color={palette.orange500} weight="fill" />
              </View>
              <Text style={styles.cardTitle}>当前版本</Text>
            </View>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>{`v${appVersion}`}</Text>
            </View>
          </View>
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </ScrollView>
      <BottomDock
        activeTab="profile"
        onHome={() => router.navigate('/(tabs)')}
        onRecord={() => router.navigate('/(tabs)/record')}
        onRecommend={() => router.navigate('/(tabs)/recommend')}
        onTrend={() => router.navigate('/(tabs)/trend')}
        onProfile={() => router.navigate('/(tabs)/settings')}
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
      gap: 14,
    },
    featureCard: {
      borderColor: palette.stone100,
    },
    versionCard: {
      borderColor: palette.stone100,
    },
    themeHeader: {
      gap: 12,
    },
    themeTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    themeTitleBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    themeTitleTextGroup: {
      flex: 1,
      gap: 4,
    },
    themeSubtitle: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '600',
    },
    themeCardTitle: {
    },
    themeLivePill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    themeLiveDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: palette.orange500,
    },
    themeLiveText: {
      fontSize: 12,
      fontWeight: '700',
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
      position: 'relative',
    },
    accountAvatarText: {
      fontSize: 24,
      fontWeight: '800',
      color: palette.stone800,
    },
    accountAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
    },
    accountAvatarBadge: {
      position: 'absolute',
      right: 0,
      bottom: 2,
      width: 20,
      height: 20,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.green500,
      borderWidth: 2,
      borderColor: palette.white,
    },
    accountHeroTextGroup: {
      flex: 1,
      marginLeft: 12,
      marginRight: 8,
      gap: 6,
    },
    accountHeroTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    accountHeroTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: palette.stone850,
      flexShrink: 1,
    },
    accountRoleBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountRoleBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    accountHeroSubtitle: {
      fontSize: 12,
      color: palette.stone500,
      fontWeight: '600',
    },
    accountHeroBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 4,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    accountInfoGrid: {
      flexDirection: 'column',
      gap: 8,
    },
    accountInfoChip: {
      minHeight: 68,
      gap: 6,
      backgroundColor: palette.surfaceWarm,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: palette.stone100,
    },
    accountInfoChipWide: {
      width: '100%',
    },
    accountInfoHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    accountInfoIcon: {
      width: 22,
      height: 22,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.white,
      borderWidth: 1,
      borderColor: palette.stone100,
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
      padding: 18,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 12,
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
      gap: 12,
    },
    entryTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    entryTitleTextGroup: {
      flex: 1,
      gap: 2,
    },
    entryIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    healthIconBadge: {
      backgroundColor: palette.gold100,
      borderColor: palette.gold200,
    },
    goalsIconBadge: {
      backgroundColor: palette.warm100,
      borderColor: palette.gold100,
    },
    entryOverline: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone500,
    },
    entrySummary: {
      fontSize: 14,
      color: palette.stone700,
      lineHeight: 20,
    },
    entryMetricGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    entryMetricChip: {
      flex: 1,
      minHeight: 58,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.surfaceWarm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    entryMetricTextGroup: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    entryMetricLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.stone500,
    },
    entryMetricValue: {
      fontSize: 13,
      fontWeight: '800',
      color: palette.stone850,
    },
    entryFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
    },
    healthStatusDot: {
      backgroundColor: palette.orange500,
    },
    goalsStatusDot: {
      backgroundColor: palette.green500,
    },
    pendingStatusDot: {
      backgroundColor: palette.stone400,
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
      borderRadius: 24,
      borderWidth: 1,
    },
    themeButton: {
      flex: 1,
      minHeight: 132,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'transparent',
    },
    themeButtonActive: {
      shadowColor: palette.orange500,
      shadowOpacity: 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
    },
    themeButtonPressed: {
      transform: [{ scale: 0.97 }],
    },
    themeButtonGlow: {
      position: 'absolute',
      top: -28,
      width: 84,
      height: 84,
      borderRadius: 999,
      opacity: 0,
    },
    themeButtonGlowActive: {
      opacity: 1,
    },
    themeIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    themeIconWrapActive: {
      backgroundColor: palette.orange500,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    themeButtonText: {
      fontSize: 14,
      fontWeight: '800',
    },
    themeButtonTextActive: {
    },
    themeButtonDescription: {
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    themeButtonDescriptionActive: {
    },
    themeButtonIndicator: {
      width: 24,
      height: 4,
      borderRadius: 999,
      marginTop: 2,
    },
    themeButtonIndicatorActive: {
      width: 34,
      backgroundColor: palette.orange500,
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
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    sectionIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    versionBadge: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    versionBadgeText: {
      color: palette.stone850,
      fontSize: 13,
      fontWeight: '800',
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
