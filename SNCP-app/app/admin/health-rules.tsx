import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ArrowsClockwise, CaretRight, ChartLineUp, Image as ImageIcon, Sparkle, User } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AmbientBackground } from '@/components/ambient-background';
import { PageHeader } from '@/components/page-header';
import { Palette } from '@/constants/palette';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import {
  fetchAdminDashboard,
  fetchAdminDashboardUsers,
  type AdminDashboardDailyAiCall,
  type AdminDashboardResponse,
  type AdminDashboardTokenStats,
  type AdminDashboardUser,
  type AdminDashboardUsersMeta,
} from '@/services/admin-dashboard';

const DASHBOARD_DAYS = 7;
const MAX_BAR_HEIGHT = 132;
const USER_PAGE_SIZE = 10;

type SummaryMetric = {
  key: string;
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<any>;
  accentColor: string;
  accentBackground: string;
};

export default function AdminDashboardScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const styles = useMemo(() => createStyles(palette, isDark), [isDark, palette]);

  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [users, setUsers] = useState<AdminDashboardUser[]>([]);
  const [usersMeta, setUsersMeta] = useState<AdminDashboardUsersMeta>({
    limit: USER_PAGE_SIZE,
    offset: 0,
    returned: 0,
    has_more: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);
  const [errorText, setErrorText] = useState('');

  const loadDashboard = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!token) {
        setLoading(false);
        setRefreshing(false);
        setDashboard(null);
        setErrorText('请先登录后再进入后台数据管理');
        return;
      }

      if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const result = await fetchAdminDashboard(token, DASHBOARD_DAYS, USER_PAGE_SIZE);
        setDashboard(result);
        setUsers(result.users || []);
        setUsersMeta(
          result.users_meta || {
            limit: USER_PAGE_SIZE,
            offset: 0,
            returned: result.users?.length || 0,
            has_more: false,
          },
        );
        setErrorText('');
      } catch (error) {
        setErrorText(error instanceof Error ? error.message : '加载后台数据失败');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  const handleLoadMoreUsers = useCallback(async () => {
    if (!token || loadingMoreUsers || !usersMeta.has_more) {
      return;
    }

    setLoadingMoreUsers(true);
    try {
      const nextOffset = users.length;
      const result = await fetchAdminDashboardUsers(token, USER_PAGE_SIZE, nextOffset);
      setUsers((current) => [...current, ...(result.users || [])]);
      setUsersMeta(result.users_meta);
      setErrorText('');
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : '加载更多用户失败');
    } finally {
      setLoadingMoreUsers(false);
    }
  }, [loadingMoreUsers, token, users.length, usersMeta.has_more]);

  useFocusEffect(
    useCallback(() => {
      void loadDashboard();
    }, [loadDashboard]),
  );

  const summaryMetrics = useMemo<SummaryMetric[]>(() => {
    const summary = dashboard?.summary;
    return [
      {
        key: 'active30d',
        label: '近30天活跃',
        value: summary?.active_users_30d ?? 0,
        hint: '过去 30 天有登录、记餐或 AI 调用',
        icon: Sparkle,
        accentColor: palette.orange500,
        accentBackground: 'rgba(255, 140, 66, 0.14)',
      },
      {
        key: 'dailyActive',
        label: '今日日活',
        value: summary?.daily_active_users ?? 0,
        hint: '当天触达过应用的真实用户数',
        icon: ChartLineUp,
        accentColor: palette.green500,
        accentBackground: 'rgba(76, 175, 80, 0.14)',
      },
      {
        key: 'aiCallsToday',
        label: '今日 AI 调用',
        value: summary?.ai_calls_today ?? 0,
        hint: '识图、分析、推荐与食谱识别总次数',
        icon: ImageIcon,
        accentColor: palette.blue500,
        accentBackground: 'rgba(106, 142, 174, 0.16)',
      },
      {
        key: 'totalUsers',
        label: '用户总数',
        value: summary?.total_users ?? 0,
        hint: '当前账号池中的总注册用户量',
        icon: User,
        accentColor: palette.imperial500,
        accentBackground: 'rgba(239, 71, 111, 0.14)',
      },
    ];
  }, [dashboard?.summary, palette.blue500, palette.green500, palette.imperial500, palette.orange500]);

  const emptyState = !loading && !dashboard;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <AmbientBackground variant="home" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDashboard('refresh')} />}
      >
        <PageHeader
          title="后台数据管理"
          subtitle="集中查看模型额度、活跃趋势与用户明细，让管理员能更快判断资源消耗和运营状态。"
          backLabel="返回设置"
          eyebrow="管理员后台"
          onBack={() => router.back()}
        />

        {loading && !dashboard ? (
          <View style={[styles.panelCard, styles.loadingCard]}>
            <ActivityIndicator color={palette.orange500} />
            <Text style={styles.loadingText}>正在加载后台数据...</Text>
          </View>
        ) : null}

        {emptyState ? (
          <View style={[styles.panelCard, styles.emptyCard]}>
            <Text style={styles.emptyTitle}>暂时还没有可展示的数据</Text>
            <Text style={styles.emptySubtitle}>{errorText || '可以稍后重试，或确认当前账号是否具备管理员权限。'}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadDashboard()}>
              <ArrowsClockwise size={16} color={palette.stone900} weight="bold" />
              <Text style={styles.retryButtonText}>重新加载</Text>
            </Pressable>
          </View>
        ) : null}

        {dashboard ? (
          <>
            <View style={[styles.panelCard, styles.heroCard]}>
              <LinearGradient
                colors={['rgba(255,140,66,0.18)', 'rgba(255,255,255,0.04)', 'rgba(239,71,111,0.12)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.heroOrbLarge} />
              <View style={styles.heroOrbSmall} />
              <View style={styles.heroHeaderRow}>
                <View style={styles.heroTextWrap}>
                  <Text style={styles.heroEyebrow}>运营概览</Text>
                  <Text style={styles.heroTitle}>掌握资源余量与用户热度</Text>
                  <Text style={styles.heroSubtitle}>
                    这里汇总模型额度、调用走势和用户活跃情况，适合快速巡检当天运行状态。
                  </Text>
                </View>
                <View style={styles.liveBadge}>
                  <Sparkle size={14} color={palette.orange500} weight="fill" />
                  <Text style={styles.liveBadgeText}>最近 {DASHBOARD_DAYS} 天</Text>
                </View>
              </View>

              <View style={styles.heroPrimaryRow}>
                <View style={styles.heroPrimaryPanel}>
                  <Text style={styles.heroPrimaryValue}>{formatCompactNumber(dashboard.summary.ai_calls_total)}</Text>
                  <Text style={styles.heroPrimaryLabel}>累计 AI 调用次数</Text>
                  <Text style={styles.heroPrimaryHint}>
                    今日新增 {formatCompactNumber(dashboard.summary.ai_calls_today)} 次，持续关注资源消耗峰值。
                  </Text>
                </View>
                <View style={styles.heroPrimaryDivider} />
                <View style={styles.heroSecondaryPanel}>
                  <Text style={styles.heroSecondaryValue}>{formatCompactNumber(dashboard.summary.total_users)}</Text>
                  <Text style={styles.heroSecondaryLabel}>累计注册用户</Text>
                  <Text style={styles.heroSecondaryHint}>
                    近 30 天活跃 {formatCompactNumber(dashboard.summary.active_users_30d)} 人，日活 {formatCompactNumber(dashboard.summary.daily_active_users)}。
                  </Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                {summaryMetrics.map((item) => {
                  const Icon = item.icon;
                  return (
                    <View key={item.key} style={styles.metricCard}>
                      <View style={[styles.metricIconWrap, { backgroundColor: item.accentBackground }]}>
                        <Icon size={18} color={item.accentColor} weight="fill" />
                      </View>
                      <Text style={styles.metricValue}>{formatCompactNumber(item.value)}</Text>
                      <Text style={styles.metricLabel}>{item.label}</Text>
                      <Text style={styles.metricHint}>{item.hint}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>模型额度总览</Text>
              <Text style={styles.sectionHint}>按文本模型与图像模型分别观察总额度、剩余额度与今日消耗。</Text>
            </View>

            <TokenCard
              title="文本模型额度"
              subtitle="GLM-4.7 资源包，覆盖推荐与营养分析等文本能力"
              icon={Sparkle}
              accentColor={palette.orange500}
              gradientColors={['rgba(255,140,66,0.2)', 'rgba(255,140,66,0.04)']}
              token={dashboard.tokens.text}
              styles={styles}
              palette={palette}
            />

            <TokenCard
              title="图像模型额度"
              subtitle="GLM-4.6V 资源包，覆盖识图与图像食谱解析等视觉能力"
              icon={ImageIcon}
              accentColor={palette.blue500}
              gradientColors={['rgba(106,142,174,0.2)', 'rgba(106,142,174,0.04)']}
              token={dashboard.tokens.image}
              styles={styles}
              palette={palette}
            />

            <AiCallsChartCard points={dashboard.daily_ai_calls} styles={styles} palette={palette} />

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>用户列表</Text>
              <Text style={styles.sectionHint}>
                共 {formatCompactNumber(dashboard.summary.total_users)} 位用户，当前已按最近活跃度加载 {users.length} 位。
              </Text>
            </View>

            <View style={[styles.panelCard, styles.usersCard]}>
              {users.length === 0 ? (
                <View style={styles.userEmptyState}>
                  <Text style={styles.emptyTitle}>还没有用户数据</Text>
                  <Text style={styles.emptySubtitle}>当前环境可能刚初始化，后续有登录和使用后会逐步累积。</Text>
                </View>
              ) : (
                users.map((item) => (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.userRow, pressed && styles.userRowPressed]}
                    onPress={() =>
                      router.push({
                        pathname: '/admin/users/[userId]',
                        params: { userId: item.id },
                      })
                    }
                  >
                    <View style={styles.userAvatar}>
                      {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={styles.userAvatarImage} contentFit="cover" />
                      ) : (
                        <Text style={styles.userAvatarText}>{resolveAvatarText(item)}</Text>
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userTitleRow}>
                        <Text style={styles.userName} numberOfLines={1}>
                          {item.display_name || '未设置昵称'}
                        </Text>
                        <Text style={styles.userPhone}>{item.phone || '--'}</Text>
                      </View>
                      <View style={styles.userMetaRow}>
                        {resolveRoleLabels(item).map((roleLabel) => (
                          <View
                            key={`${item.id}-${roleLabel}`}
                            style={[
                              styles.rolePill,
                              {
                                backgroundColor: resolveRoleBadgeMeta(roleLabel, palette).backgroundColor,
                                borderColor: resolveRoleBadgeMeta(roleLabel, palette).borderColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.rolePillText,
                                { color: resolveRoleBadgeMeta(roleLabel, palette).textColor },
                              ]}
                            >
                              {roleLabel}
                            </Text>
                          </View>
                        ))}
                        <View style={styles.userStatPill}>
                          <Text style={styles.userStatPillText}>记餐 {formatCompactNumber(item.meal_count)}</Text>
                        </View>
                        <View style={styles.userStatPill}>
                          <Text style={styles.userStatPillText}>AI {formatCompactNumber(item.ai_call_count)}</Text>
                        </View>
                      </View>
                      <Text style={styles.userActivityText}>最近活跃：{formatDateTime(item.last_active_at)}</Text>
                    </View>
                    <CaretRight size={16} color={palette.stone400} weight="bold" />
                  </Pressable>
                ))
              )}
              {usersMeta.has_more ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.loadMoreButton,
                    pressed && styles.loadMoreButtonPressed,
                    loadingMoreUsers && styles.loadMoreButtonDisabled,
                  ]}
                  onPress={() => void handleLoadMoreUsers()}
                  disabled={loadingMoreUsers}
                >
                  {loadingMoreUsers ? <ActivityIndicator size="small" color={palette.orange500} /> : null}
                  <Text style={styles.loadMoreButtonText}>{loadingMoreUsers ? '正在加载更多用户...' : '查看更多用户'}</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TokenCard({
  title,
  subtitle,
  icon: Icon,
  accentColor,
  gradientColors,
  token,
  styles,
  palette,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  accentColor: string;
  gradientColors: [string, string];
  token: AdminDashboardTokenStats;
  styles: ReturnType<typeof createStyles>;
  palette: Palette;
}) {
  const usagePercent = token.quota_total > 0 ? Math.min(token.used_total / token.quota_total, 1) : 0;
  return (
    <View style={[styles.panelCard, styles.tokenCard]}>
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject} />
      <View style={styles.tokenHeader}>
        <View style={styles.tokenTitleRow}>
          <View style={[styles.tokenIconWrap, { backgroundColor: `${accentColor}22` }]}>
            <Icon size={18} color={accentColor} weight="fill" />
          </View>
          <View style={styles.tokenTitleTextWrap}>
            <Text style={styles.tokenTitle}>{title}</Text>
            <Text style={styles.tokenSubtitle}>{subtitle}</Text>
          </View>
        </View>
        <View style={styles.tokenModelBadge}>
          <Text style={styles.tokenModelText}>{token.primary_model || '尚未产生调用'}</Text>
        </View>
      </View>

      <View style={styles.tokenBody}>
        <View style={styles.tokenValueBlock}>
          <Text style={styles.tokenLeadLabel}>剩余额度</Text>
          <Text style={styles.tokenLeadValue}>{formatTokenValue(token.remaining_total)}</Text>
          <Text style={styles.tokenLeadHint}>总额度 {formatTokenValue(token.quota_total)}，累计已用 {formatTokenValue(token.used_total)}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.max(usagePercent * 100, 2)}%`, backgroundColor: accentColor }]} />
        </View>
        <View style={styles.tokenStatsRow}>
          <View style={styles.tokenStatItem}>
            <Text style={styles.tokenStatValue}>{formatTokenValue(token.used_today)}</Text>
            <Text style={styles.tokenStatLabel}>今日消耗</Text>
          </View>
          <View style={styles.tokenStatItem}>
            <Text style={styles.tokenStatValue}>{formatCompactNumber(token.call_today)}</Text>
            <Text style={styles.tokenStatLabel}>今日调用</Text>
          </View>
          <View style={styles.tokenStatItem}>
            <Text style={styles.tokenStatValue}>{formatCompactNumber(token.call_total)}</Text>
            <Text style={styles.tokenStatLabel}>累计调用</Text>
          </View>
        </View>
      </View>
      <View style={styles.tokenFootnote}>
        <Text style={[styles.tokenFootnoteText, { color: palette.stone500 }]}>
          使用率 {Math.round(usagePercent * 100)}%，当前先按你提供的后台资源包额度做初始基线，并叠加应用内后续消耗更新。
        </Text>
      </View>
    </View>
  );
}

function AiCallsChartCard({
  points,
  styles,
  palette,
}: {
  points: AdminDashboardDailyAiCall[];
  styles: ReturnType<typeof createStyles>;
  palette: Palette;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const activePoint =
    points.find((item) => item.key === activeKey) ||
    [...points].reverse().find((item) => item.total_calls > 0) ||
    points[points.length - 1] ||
    null;
  const maxValue = Math.max(...points.map((item) => item.total_calls), 1);

  return (
    <View style={[styles.panelCard, styles.chartCard]}>
      <View style={styles.chartHeader}>
        <View style={styles.chartHeaderTextWrap}>
          <Text style={styles.sectionTitle}>AI 调用次数条形图</Text>
          <Text style={styles.sectionHint}>点击柱形可切换查看每天的文本/图像调用构成。</Text>
        </View>
        <View style={styles.chartSummaryBadge}>
          <Text style={styles.chartSummaryValue}>{formatCompactNumber(activePoint?.total_calls ?? 0)}</Text>
          <Text style={styles.chartSummaryLabel}>{activePoint?.label || '--'}</Text>
        </View>
      </View>

      <View style={styles.chartLegendRow}>
        <View style={styles.chartLegendItem}>
          <View style={[styles.chartLegendDot, { backgroundColor: palette.orange500 }]} />
          <Text style={styles.chartLegendText}>文本模型</Text>
        </View>
        <View style={styles.chartLegendItem}>
          <View style={[styles.chartLegendDot, { backgroundColor: palette.blue500 }]} />
          <Text style={styles.chartLegendText}>图像模型</Text>
        </View>
      </View>

      {points.length === 0 ? (
        <View style={styles.chartEmptyState}>
          <Text style={styles.emptySubtitle}>暂无 AI 调用记录，后续使用识图、分析或推荐后会自动累积。</Text>
        </View>
      ) : (
        <>
          <View style={styles.chartBarsRow}>
            {points.map((item) => {
              const totalHeight = Math.max((item.total_calls / maxValue) * MAX_BAR_HEIGHT, item.total_calls > 0 ? 16 : 6);
              const imageRatio = item.total_calls > 0 ? item.image_calls / item.total_calls : 0;
              const imageHeight = item.total_calls > 0 ? Math.max(totalHeight * imageRatio, item.image_calls > 0 ? 10 : 0) : 0;
              const textHeight = Math.max(totalHeight - imageHeight, item.text_calls > 0 ? 10 : 0);
              const isActive = activePoint?.key === item.key;
              return (
                <Pressable
                  key={item.key}
                  style={styles.chartBarSlot}
                  onPress={() => setActiveKey((current) => (current === item.key ? null : item.key))}
                >
                  <View style={[styles.chartBarTrack, isActive && styles.chartBarTrackActive]}>
                    {item.total_calls > 0 ? (
                      <>
                        <View style={[styles.chartTextBar, { height: textHeight }]} />
                        {item.image_calls > 0 ? <View style={[styles.chartImageBar, { height: imageHeight }]} /> : null}
                      </>
                    ) : (
                      <View style={styles.chartZeroBar} />
                    )}
                  </View>
                  <Text style={[styles.chartBarLabel, isActive && styles.chartBarLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.chartDetailRow}>
            <View style={styles.chartDetailCard}>
              <Text style={styles.chartDetailValue}>{formatCompactNumber(activePoint?.text_calls ?? 0)}</Text>
              <Text style={styles.chartDetailLabel}>文本调用</Text>
            </View>
            <View style={styles.chartDetailCard}>
              <Text style={styles.chartDetailValue}>{formatCompactNumber(activePoint?.image_calls ?? 0)}</Text>
              <Text style={styles.chartDetailLabel}>图像调用</Text>
            </View>
            <View style={styles.chartDetailCard}>
              <Text style={styles.chartDetailValue}>{formatCompactNumber(activePoint?.total_calls ?? 0)}</Text>
              <Text style={styles.chartDetailLabel}>当日总量</Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

function formatCompactNumber(value: number) {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}亿`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)}万`;
  }
  return String(Math.max(0, Math.round(value)));
}

function formatTokenValue(value: number) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  }
  return String(Math.max(0, Math.round(value)));
}

function formatDateTime(value?: string | null, includeYear = false) {
  if (!value) {
    return '暂无';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '暂无';
  }
  return date.toLocaleString('zh-CN', {
    year: includeYear ? 'numeric' : undefined,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function resolveRoleLabels(user: AdminDashboardUser) {
  if (user.role_labels && user.role_labels.length > 0) {
    return user.role_labels;
  }
  const roles = new Set(user.roles || []);
  if (roles.has('webmaster')) {
    return ['站长'];
  }
  if (roles.has('admin')) {
    return ['管理员'];
  }
  return ['成员'];
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

function resolveAvatarText(user: AdminDashboardUser) {
  const seed = (user.display_name || user.phone || 'U').trim();
  return seed.slice(0, 1).toUpperCase();
}

function createStyles(palette: Palette, isDark: boolean) {
  const panelSurface = isDark ? 'rgba(24, 22, 20, 0.92)' : 'rgba(255, 249, 243, 0.96)';
  const panelBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(231, 218, 204, 0.9)';
  const insetSurface = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.78)';
  const subtleSurface = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255, 244, 234, 0.94)';
  const strongerSurface = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.92)';
  const orangeTint = isDark ? 'rgba(255, 140, 66, 0.14)' : 'rgba(255, 140, 66, 0.12)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(231, 218, 204, 0.82)';
  const modalSurface = isDark ? 'rgba(24,22,20,0.96)' : 'rgba(255,249,244,0.98)';

  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.surface,
    },
    content: {
      flexGrow: 1,
      padding: 20,
      paddingBottom: 36,
      gap: 16,
    },
    panelCard: {
      borderRadius: 26,
      padding: 18,
      backgroundColor: panelSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
    },
    loadingCard: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      minHeight: 160,
    },
    loadingText: {
      fontSize: 14,
      color: palette.stone700,
    },
    emptyCard: {
      gap: 12,
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
    heroCard: {
      gap: 18,
    },
    heroOrbLarge: {
      position: 'absolute',
      top: -40,
      left: -26,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(255, 140, 66, 0.14)',
    },
    heroOrbSmall: {
      position: 'absolute',
      right: -30,
      top: 56,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(239, 71, 111, 0.1)',
    },
    heroHeaderRow: {
      gap: 14,
    },
    heroTextWrap: {
      gap: 8,
    },
    heroEyebrow: {
      alignSelf: 'flex-start',
      fontSize: 12,
      fontWeight: '800',
      color: palette.orange500,
      backgroundColor: 'rgba(255, 140, 66, 0.14)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      overflow: 'hidden',
    },
    heroTitle: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      color: palette.stone900,
    },
    heroSubtitle: {
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone600,
    },
    liveBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: subtleSurface,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    liveBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone800,
    },
    heroPrimaryRow: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: panelBorder,
      backgroundColor: insetSurface,
      padding: 16,
      gap: 14,
    },
    heroPrimaryPanel: {
      gap: 6,
    },
    heroPrimaryValue: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: '800',
      color: palette.stone900,
    },
    heroPrimaryLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone700,
    },
    heroPrimaryHint: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone500,
    },
    heroPrimaryDivider: {
      height: 1,
      backgroundColor: dividerColor,
    },
    heroSecondaryPanel: {
      gap: 6,
    },
    heroSecondaryValue: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      color: palette.stone900,
    },
    heroSecondaryLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone700,
    },
    heroSecondaryHint: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone500,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metricCard: {
      width: '47%',
      minWidth: 148,
      borderRadius: 20,
      padding: 14,
      backgroundColor: insetSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 8,
    },
    metricIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metricValue: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      color: palette.stone900,
    },
    metricLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone700,
    },
    metricHint: {
      fontSize: 12,
      lineHeight: 18,
      color: palette.stone500,
    },
    sectionHeader: {
      gap: 4,
      paddingHorizontal: 2,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.stone900,
    },
    sectionHint: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone600,
    },
    tokenCard: {
      gap: 16,
    },
    tokenHeader: {
      gap: 12,
    },
    tokenTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    tokenIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tokenTitleTextWrap: {
      flex: 1,
      gap: 4,
    },
    tokenTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: palette.stone900,
    },
    tokenSubtitle: {
      fontSize: 13,
      color: palette.stone600,
    },
    tokenModelBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: subtleSurface,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    tokenModelText: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone700,
    },
    tokenBody: {
      gap: 12,
    },
    tokenValueBlock: {
      gap: 6,
    },
    tokenLeadLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone600,
    },
    tokenLeadValue: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '800',
      color: palette.stone900,
    },
    tokenLeadHint: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone500,
    },
    progressTrack: {
      width: '100%',
      height: 10,
      borderRadius: 999,
      backgroundColor: subtleSurface,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      minWidth: 2,
      borderRadius: 999,
    },
    tokenStatsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    tokenStatItem: {
      flex: 1,
      borderRadius: 18,
      padding: 12,
      backgroundColor: insetSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 4,
    },
    tokenStatValue: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    tokenStatLabel: {
      fontSize: 12,
      color: palette.stone500,
    },
    tokenFootnote: {
      marginTop: -2,
    },
    tokenFootnoteText: {
      fontSize: 12,
      lineHeight: 18,
    },
    chartCard: {
      gap: 16,
    },
    chartHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    chartHeaderTextWrap: {
      flex: 1,
      gap: 4,
    },
    chartSummaryBadge: {
      minWidth: 84,
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: insetSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      alignItems: 'center',
      gap: 2,
    },
    chartSummaryValue: {
      fontSize: 20,
      fontWeight: '800',
      color: palette.stone900,
    },
    chartSummaryLabel: {
      fontSize: 12,
      color: palette.stone500,
    },
    chartLegendRow: {
      flexDirection: 'row',
      gap: 16,
    },
    chartLegendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chartLegendDot: {
      width: 10,
      height: 10,
      borderRadius: 999,
    },
    chartLegendText: {
      fontSize: 12,
      color: palette.stone600,
      fontWeight: '700',
    },
    chartBarsRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
      minHeight: 170,
      paddingTop: 8,
    },
    chartBarSlot: {
      flex: 1,
      alignItems: 'center',
      gap: 10,
    },
    chartBarTrack: {
      width: '100%',
      maxWidth: 34,
      height: 150,
      borderRadius: 18,
      backgroundColor: insetSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      overflow: 'hidden',
      justifyContent: 'flex-end',
      padding: 4,
      gap: 4,
    },
    chartBarTrackActive: {
      backgroundColor: orangeTint,
      borderColor: 'rgba(255,140,66,0.24)',
      transform: [{ translateY: -4 }],
    },
    chartTextBar: {
      width: '100%',
      borderRadius: 12,
      backgroundColor: palette.orange500,
    },
    chartImageBar: {
      width: '100%',
      borderRadius: 12,
      backgroundColor: palette.blue500,
    },
    chartZeroBar: {
      width: '100%',
      height: 6,
      borderRadius: 999,
      backgroundColor: subtleSurface,
    },
    chartBarLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.stone500,
    },
    chartBarLabelActive: {
      color: palette.stone900,
    },
    chartDetailRow: {
      flexDirection: 'row',
      gap: 10,
    },
    chartDetailCard: {
      flex: 1,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 10,
      backgroundColor: insetSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 4,
      alignItems: 'center',
    },
    chartDetailValue: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    chartDetailLabel: {
      fontSize: 12,
      color: palette.stone500,
    },
    chartEmptyState: {
      minHeight: 120,
      justifyContent: 'center',
    },
    usersCard: {
      gap: 12,
    },
    userEmptyState: {
      gap: 8,
    },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 20,
      padding: 14,
      backgroundColor: strongerSurface,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    userRowPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.992 }],
    },
    userAvatar: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: orangeTint,
      borderWidth: 1,
      borderColor: 'rgba(255,140,66,0.22)',
    },
    userAvatarText: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.orange500,
    },
    userAvatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 23,
    },
    userInfo: {
      flex: 1,
      gap: 8,
    },
    userTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    userName: {
      flex: 1,
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone900,
    },
    userPhone: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone500,
    },
    userMetaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    rolePill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: orangeTint,
      borderWidth: 1,
    },
    rolePillText: {
      fontSize: 11,
      fontWeight: '800',
      color: palette.orange500,
    },
    userStatPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: subtleSurface,
    },
    userStatPillText: {
      fontSize: 11,
      fontWeight: '700',
      color: palette.stone700,
    },
    userActivityText: {
      fontSize: 12,
      color: palette.stone500,
    },
    loadMoreButton: {
      marginTop: 4,
      minHeight: 48,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: panelBorder,
      backgroundColor: insetSurface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    loadMoreButtonPressed: {
      opacity: 0.9,
    },
    loadMoreButtonDisabled: {
      opacity: 0.7,
    },
    loadMoreButtonText: {
      fontSize: 14,
      fontWeight: '800',
      color: palette.stone800,
    },
    modalMask: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.46)',
    },
    modalCard: {
      borderRadius: 28,
      padding: 20,
      backgroundColor: modalSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 18,
      overflow: 'hidden',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    modalEyebrow: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.orange500,
      marginBottom: 6,
    },
    modalTitle: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '800',
      color: palette.stone900,
    },
    modalSubtitle: {
      fontSize: 13,
      color: palette.stone600,
      marginTop: 4,
    },
    modalCloseButton: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: subtleSurface,
      borderWidth: 1,
      borderColor: panelBorder,
    },
    modalCloseButtonText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.stone800,
    },
    modalGrid: {
      gap: 10,
    },
    detailItem: {
      borderRadius: 18,
      padding: 14,
      backgroundColor: insetSurface,
      borderWidth: 1,
      borderColor: panelBorder,
      gap: 6,
    },
    detailLabel: {
      fontSize: 12,
      color: palette.stone500,
      fontWeight: '700',
    },
    detailValue: {
      fontSize: 14,
      lineHeight: 21,
      color: palette.stone900,
      fontWeight: '700',
    },
  });
}
