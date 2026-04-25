import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowsClockwise,
  CheckCircle,
  Fire,
  ForkKnife,
  Heartbeat,
  Phone,
  Ruler,
  Scales,
  ShieldCheck,
  ShieldSlash,
  Target,
} from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ambient-background';
import { PageHeader } from '@/components/page-header';
import {
  formatNutritionGoalRange,
  getDefaultNutritionGoalsSummary,
  hasConfiguredNutritionGoals,
} from '@/constants/nutrition-goals';
import { Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import {
  fetchAdminUserDetail,
  promoteAdminUser,
  revokeAdminUser,
  type AdminDashboardUserDetailResponse,
} from '@/services/admin-dashboard';

export default function AdminUserDetailScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [detail, setDetail] = useState<AdminDashboardUserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<'promote' | 'revoke' | null>(null);
  const [errorText, setErrorText] = useState('');
  const [successText, setSuccessText] = useState('');

  const loadDetail = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!token || !userId) {
        setDetail(null);
        setLoading(false);
        setRefreshing(false);
        setErrorText('用户不存在或当前未登录');
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await fetchAdminUserDetail(token, userId);
        setDetail(result);
        setErrorText('');
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : '加载用户详情失败');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, userId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadDetail();
    }, [loadDetail]),
  );

  const handlePromote = useCallback(async () => {
    if (!token || !userId) {
      return;
    }
    setActionLoading('promote');
    setSuccessText('');
    setErrorText('');
    try {
      const result = await promoteAdminUser(token, userId);
      setSuccessText(result.message || '已设置为管理员');
      await loadDetail('refresh');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '设置管理员失败');
    } finally {
      setActionLoading(null);
    }
  }, [loadDetail, token, userId]);

  const handleRevoke = useCallback(async () => {
    if (!token || !userId) {
      return;
    }
    setActionLoading('revoke');
    setSuccessText('');
    setErrorText('');
    try {
      const result = await revokeAdminUser(token, userId);
      setSuccessText(result.message || '已撤销管理员权限');
      await loadDetail('refresh');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '撤销管理员失败');
    } finally {
      setActionLoading(null);
    }
  }, [loadDetail, token, userId]);

  const user = detail?.user;
  const profile = detail?.profile || {};
  const goals = detail?.goals || {};
  const permissions = detail?.permissions;
  const roleMeta = resolveRoleMeta(user?.roles || [], palette);
  const avatarSeed = (user?.display_name || user?.phone || 'U').trim();
  const avatarText = avatarSeed.slice(0, 1).toUpperCase();
  const healthSummary = [
    profile.gender ? `性别 ${profile.gender}` : '',
    profile.birth_year ? `${profile.birth_year}年生` : '',
    profile.height_cm ? `${profile.height_cm}cm` : '',
    profile.weight_kg ? `${profile.weight_kg}kg` : '',
    (profile.chronic_conditions || []).length > 0 ? `慢病 ${(profile.chronic_conditions || []).join('、')}` : '',
  ]
    .filter(Boolean)
    .join(' · ') || '未完善，点击填写';
  const goalsSummary = [
    formatNutritionGoalRange(goals.calories_min, goals.calories_max, 'kcal')
      ? `热量 ${formatNutritionGoalRange(goals.calories_min, goals.calories_max, 'kcal')}`
      : '',
    formatNutritionGoalRange(goals.protein_min, goals.protein_max, 'g')
      ? `蛋白 ${formatNutritionGoalRange(goals.protein_min, goals.protein_max, 'g')}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ') || `默认建议：${getDefaultNutritionGoalsSummary()}`;
  const hasCustomGoals = hasConfiguredNutritionGoals(goals);
  const roleLabels = resolveRoleLabels(user?.roles || []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <AmbientBackground variant="home" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDetail('refresh')} />}
      >
        <PageHeader
          title="用户详情"
          subtitle="查看该用户的账号信息、健康档案与营养目标；站长可在这里管理管理员权限。"
          backLabel="返回后台"
          eyebrow="后台用户"
          onBack={() => router.back()}
        />

        <Pressable style={styles.refreshButton} onPress={() => void loadDetail('refresh')}>
          <ArrowsClockwise size={16} color={palette.stone800} weight="bold" />
          <Text style={styles.refreshButtonText}>刷新</Text>
        </Pressable>

        {loading && !detail ? (
          <View style={[styles.card, styles.loadingCard]}>
            <ActivityIndicator color={palette.orange500} />
            <Text style={styles.loadingText}>正在加载用户详情...</Text>
          </View>
        ) : null}

        {!loading && !detail ? (
          <View style={[styles.card, styles.emptyCard]}>
            <Text style={styles.emptyTitle}>暂时无法打开这个用户</Text>
            <Text style={styles.emptySubtitle}>{errorText || '可以手动刷新，或稍后重试。'}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadDetail()}>
              <ArrowsClockwise size={16} color={palette.stone900} weight="bold" />
              <Text style={styles.retryButtonText}>重新加载</Text>
            </Pressable>
          </View>
        ) : null}

        {detail ? (
          <>
            <View style={[styles.card, styles.accountCard]}>
              <View style={styles.accountHero}>
                <View style={styles.accountHeroMain}>
                  <View style={styles.accountAvatar}>
                    {user?.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={styles.accountAvatarImage} contentFit="cover" />
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
                        {user?.display_name || '未设置昵称'}
                      </Text>
                      <View
                        style={[
                          styles.roleBadge,
                          {
                            backgroundColor: roleMeta.backgroundColor,
                            borderColor: roleMeta.borderColor,
                          },
                        ]}
                      >
                        <Text style={[styles.roleBadgeText, { color: roleMeta.textColor }]}>{roleMeta.label}</Text>
                      </View>
                    </View>
                    <View style={styles.accountHeroBadge}>
                      <CheckCircle size={13} color={palette.orange500} weight="fill" />
                      <Text style={styles.accountHeroSubtitle}>账号信息</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.infoChip}>
                <View style={styles.infoHead}>
                  <View style={styles.infoIcon}>
                    <Phone size={14} color={palette.orange500} weight="bold" />
                  </View>
                  <Text style={styles.metaLabel}>已绑定手机号</Text>
                </View>
                <Text style={styles.metaText}>{user?.phone || '--'}</Text>
              </View>

              <View style={styles.roleListRow}>
                {roleLabels.map((label) => {
                  const meta = resolveRoleBadgeMeta(label, palette);
                  return (
                    <View
                      key={label}
                      style={[
                        styles.inlineRolePill,
                        { backgroundColor: meta.backgroundColor, borderColor: meta.borderColor },
                      ]}
                    >
                      <Text style={[styles.inlineRolePillText, { color: meta.textColor }]}>{label}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statChip}>
                  <Text style={styles.statValue}>{user?.meal_count || 0}</Text>
                  <Text style={styles.statLabel}>累计记餐</Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statValue}>{user?.ai_call_count || 0}</Text>
                  <Text style={styles.statLabel}>AI 调用</Text>
                </View>
              </View>

              <Text style={styles.helperText}>最近活跃：{formatDateTime(user?.last_active_at)}</Text>
              <Text style={styles.helperText}>最近登录：{formatDateTime(user?.last_login_at)}</Text>

              {permissions?.viewer_can_manage_roles ? (
                <View style={styles.actionRow}>
                  {permissions.can_promote_to_admin ? (
                    <Pressable style={styles.primaryButton} onPress={() => void handlePromote()} disabled={actionLoading !== null}>
                      {actionLoading === 'promote' ? (
                        <ActivityIndicator size="small" color={palette.stone900} />
                      ) : (
                        <ShieldCheck size={16} color={palette.stone900} weight="bold" />
                      )}
                      <Text style={styles.primaryButtonText}>设为管理员</Text>
                    </Pressable>
                  ) : null}

                  {permissions.can_revoke_admin ? (
                    <Pressable style={styles.secondaryButton} onPress={() => void handleRevoke()} disabled={actionLoading !== null}>
                      {actionLoading === 'revoke' ? (
                        <ActivityIndicator size="small" color={palette.imperial500} />
                      ) : (
                        <ShieldSlash size={16} color={palette.imperial500} weight="bold" />
                      )}
                      <Text style={styles.secondaryButtonText}>撤销管理员</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {successText ? <Text style={styles.successText}>{successText}</Text> : null}
              {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
            </View>

            <View style={styles.card}>
              <View style={styles.entryHead}>
                <View style={styles.entryTitleGroup}>
                  <View style={[styles.entryIconBadge, styles.healthIconBadge]}>
                    <Heartbeat size={20} color={palette.orange500} weight="fill" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>健康档案</Text>
                    <Text style={styles.entryOverline}>个人基础信息</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.entrySummary}>{healthSummary}</Text>
              <View style={styles.metricGrid}>
                <MetricChip
                  label="身高"
                  value={profile.height_cm ? `${profile.height_cm}cm` : '待填'}
                  icon={<Ruler size={16} color={palette.orange500} weight="bold" />}
                  styles={styles}
                />
                <MetricChip
                  label="体重"
                  value={profile.weight_kg ? `${profile.weight_kg}kg` : '待填'}
                  icon={<Scales size={16} color={palette.orange500} weight="bold" />}
                  styles={styles}
                />
                <MetricChip
                  label="慢病"
                  value={(profile.chronic_conditions || []).length > 0 ? `${(profile.chronic_conditions || []).length} 项` : '未记录'}
                  icon={<Heartbeat size={16} color={palette.orange500} weight="bold" />}
                  styles={styles}
                />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.entryHead}>
                <View style={styles.entryTitleGroup}>
                  <View style={[styles.entryIconBadge, styles.goalIconBadge]}>
                    <Target size={20} color={palette.green500} weight="fill" />
                  </View>
                  <View>
                    <Text style={styles.cardTitle}>营养目标</Text>
                    <Text style={styles.entryOverline}>每日摄入范围</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.entrySummary}>{goalsSummary}</Text>
              <View style={styles.metricGrid}>
                <MetricChip
                  label="热量"
                  value={formatNutritionGoalRange(goals.calories_min, goals.calories_max, 'kcal') || '默认'}
                  icon={<Fire size={16} color={palette.green500} weight="bold" />}
                  styles={styles}
                />
                <MetricChip
                  label="蛋白"
                  value={formatNutritionGoalRange(goals.protein_min, goals.protein_max, 'g') || '默认'}
                  icon={<ForkKnife size={16} color={palette.green500} weight="bold" />}
                  styles={styles}
                />
                <MetricChip
                  label="状态"
                  value={hasCustomGoals ? '已设置' : '推荐值'}
                  icon={<Target size={16} color={palette.green500} weight="bold" />}
                  styles={styles}
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricChip({
  label,
  value,
  icon,
  styles,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
}) {
  const { width: windowWidth } = useWindowDimensions();
  const chipWidth = useMemo(() => {
    const screenHorizontalPadding = 40;
    const cardHorizontalPadding = 36;
    const columnGap = 10;
    return Math.max((windowWidth - screenHorizontalPadding - cardHorizontalPadding - columnGap) / 2, 0);
  }, [windowWidth]);

  return (
    <View style={[styles.metricChip, { width: chipWidth }]}>
      {icon}
      <View style={styles.metricTextWrap}>
        <Text style={styles.metricChipLabel}>{label}</Text>
        <Text style={styles.metricChipValue}>{value}</Text>
      </View>
    </View>
  );
}

function resolveRoleMeta(roles: string[], palette: Palette) {
  const roleSet = new Set(roles || []);
  if (roleSet.has('webmaster')) {
    return {
      label: '站长',
      textColor: palette.imperial600,
      backgroundColor: palette.imperial50,
      borderColor: palette.imperial100,
    };
  }
  if (roleSet.has('admin')) {
    return {
      label: '管理员',
      textColor: palette.gold600,
      backgroundColor: palette.gold50,
      borderColor: palette.gold200,
    };
  }
  return {
    label: '成员',
    textColor: palette.stone600,
    backgroundColor: palette.stone100,
    borderColor: palette.stone200,
  };
}

function resolveRoleBadgeMeta(roleLabel: string, palette: Palette) {
  if (roleLabel === '站长') {
    return {
      textColor: palette.imperial600,
      backgroundColor: palette.imperial50,
      borderColor: palette.imperial100,
    };
  }
  if (roleLabel === '管理员') {
    return {
      textColor: palette.gold600,
      backgroundColor: palette.gold50,
      borderColor: palette.gold200,
    };
  }
  return {
    textColor: palette.stone600,
    backgroundColor: palette.stone100,
    borderColor: palette.stone200,
  };
}

function resolveRoleLabels(roles: string[]) {
  const roleSet = new Set(roles || []);
  if (roleSet.has('webmaster')) {
    return ['站长'];
  }
  if (roleSet.has('admin')) {
    return ['管理员'];
  }
  return ['成员'];
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '暂无';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.surface,
    },
    content: {
      padding: 20,
      paddingBottom: 32,
      gap: 16,
      flexGrow: 1,
    },
    refreshButton: {
      alignSelf: 'flex-end',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: palette.white,
      borderWidth: 1,
      borderColor: palette.stone100,
    },
    refreshButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: palette.stone800,
    },
    card: {
      backgroundColor: palette.white,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 12,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    loadingCard: {
      minHeight: 180,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
      color: palette.stone600,
    },
    emptyCard: {
      alignItems: 'flex-start',
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.stone900,
    },
    emptySubtitle: {
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone600,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: palette.orange500,
    },
    retryButtonText: {
      fontSize: 13,
      fontWeight: '800',
      color: palette.stone900,
    },
    accountCard: {
      gap: 14,
    },
    accountHero: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    accountHeroMain: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    accountAvatar: {
      width: 72,
      height: 72,
      borderRadius: 999,
      backgroundColor: palette.surfaceWarm,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    accountAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
    },
    accountAvatarText: {
      fontSize: 28,
      fontWeight: '800',
      color: palette.orange500,
    },
    accountAvatarBadge: {
      position: 'absolute',
      right: 0,
      bottom: 2,
      width: 22,
      height: 22,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.green500,
      borderWidth: 2,
      borderColor: palette.white,
    },
    accountHeroTextGroup: {
      flex: 1,
      marginLeft: 14,
      gap: 8,
    },
    accountHeroTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
    },
    accountHeroTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: palette.stone850,
      flexShrink: 1,
    },
    roleBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
    },
    roleBadgeText: {
      fontSize: 12,
      fontWeight: '800',
    },
    accountHeroBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    accountHeroSubtitle: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone500,
    },
    infoChip: {
      minHeight: 72,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 6,
    },
    infoHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoIcon: {
      width: 24,
      height: 24,
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
      fontWeight: '800',
      color: palette.stone800,
    },
    roleListRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    inlineRolePill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
    },
    inlineRolePillText: {
      fontSize: 11,
      fontWeight: '800',
    },
    statsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    statChip: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 4,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.stone850,
    },
    statLabel: {
      fontSize: 12,
      color: palette.stone500,
    },
    helperText: {
      fontSize: 13,
      color: palette.stone600,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 4,
    },
    primaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 18,
      backgroundColor: palette.orange500,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.stone900,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.imperial100,
      backgroundColor: palette.imperial50,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.imperial500,
    },
    successText: {
      fontSize: 13,
      color: palette.green500,
      fontWeight: '700',
    },
    errorText: {
      fontSize: 13,
      color: palette.imperial500,
      fontWeight: '700',
    },
    entryHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    entryTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    entryIconBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    healthIconBadge: {
      backgroundColor: palette.gold50,
    },
    goalIconBadge: {
      backgroundColor: '#EAF8EA',
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone850,
    },
    entryOverline: {
      fontSize: 13,
      color: palette.stone500,
      marginTop: 2,
    },
    entrySummary: {
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone600,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricChip: {
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 8,
    },
    metricTextWrap: {
      gap: 4,
    },
    metricChipLabel: {
      fontSize: 12,
      color: palette.stone500,
      fontWeight: '700',
    },
    metricChipValue: {
      fontSize: 16,
      color: palette.stone850,
      fontWeight: '800',
    },
  });
}
