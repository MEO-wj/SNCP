import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { ArrowSquareOut, ClockClockwise, FloppyDiskBack, Package, RocketLaunch } from 'phosphor-react-native';

import { AmbientBackground } from '@/components/ambient-background';
import { PageHeader } from '@/components/page-header';
import { type Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import {
  fetchAdminAppUpdate,
  saveAdminAppUpdate,
  type AdminAppUpdateResponse,
  type SaveAdminAppUpdatePayload,
} from '@/services/admin-dashboard';

type FormState = {
  latestVersion: string;
  latestBuild: string;
  minSupportedBuild: string;
  forceUpdate: boolean;
  publishedAt: string;
  releaseNotesText: string;
  androidApkUrl: string;
  androidApkPath: string;
  androidDownloadName: string;
  iosUrl: string;
};

const EMPTY_FORM: FormState = {
  latestVersion: '',
  latestBuild: '',
  minSupportedBuild: '',
  forceUpdate: false,
  publishedAt: '',
  releaseNotesText: '',
  androidApkUrl: '',
  androidApkPath: '',
  androidDownloadName: '',
  iosUrl: '',
};

function mapResponseToForm(result: AdminAppUpdateResponse): FormState {
  const { config } = result;
  return {
    latestVersion: config.latest_version || '',
    latestBuild: config.latest_build > 0 ? String(config.latest_build) : '',
    minSupportedBuild: config.min_supported_build > 0 ? String(config.min_supported_build) : '',
    forceUpdate: Boolean(config.force_update),
    publishedAt: config.published_at || '',
    releaseNotesText: (config.release_notes || []).join('\n'),
    androidApkUrl: config.android_apk_url || '',
    androidApkPath: config.android_apk_path || '',
    androidDownloadName: config.android_download_name || '',
    iosUrl: config.ios_url || '',
  };
}

function normalizeReleaseNotes(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNonNegativeInt(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  if (!/^\d+$/.test(trimmed)) {
    throw new Error('构建号必须是大于等于 0 的整数');
  }
  return Number(trimmed);
}

function buildPayload(form: FormState): SaveAdminAppUpdatePayload {
  return {
    latest_version: form.latestVersion.trim() || null,
    latest_build: parseNonNegativeInt(form.latestBuild),
    min_supported_build: parseNonNegativeInt(form.minSupportedBuild),
    force_update: form.forceUpdate,
    published_at: form.publishedAt.trim() || null,
    release_notes: normalizeReleaseNotes(form.releaseNotesText),
    android_apk_url: form.androidApkUrl.trim() || null,
    android_apk_path: form.androidApkPath.trim() || null,
    android_download_name: form.androidDownloadName.trim() || null,
    ios_url: form.iosUrl.trim() || null,
  };
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '未记录';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function AdminAppUpdateScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hintText, setHintText] = useState('');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [snapshot, setSnapshot] = useState<AdminAppUpdateResponse | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setHintText('请先登录后再进入应用更新管理');
      return;
    }

    setLoading(true);
    try {
      const result = await fetchAdminAppUpdate(token);
      setSnapshot(result);
      setForm(mapResponseToForm(result));
      setHintText('');
    } catch (error) {
      setHintText(error instanceof Error ? error.message : '加载应用更新配置失败');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleChange = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!token) {
      setHintText('请先登录后再进入应用更新管理');
      return;
    }

    let payload: SaveAdminAppUpdatePayload;
    try {
      payload = buildPayload(form);
      if (payload.latest_build > 0 && payload.min_supported_build > payload.latest_build) {
        throw new Error('最低支持构建号不能大于最新构建号');
      }
    } catch (error) {
      setHintText(error instanceof Error ? error.message : '表单填写有误');
      return;
    }

    setSaving(true);
    try {
      const result = await saveAdminAppUpdate(token, payload);
      setSnapshot(result);
      setForm(mapResponseToForm(result));
      setHintText('应用更新配置已保存，版本检测接口已切换到最新配置。');
    } catch (error) {
      setHintText(error instanceof Error ? error.message : '保存应用更新配置失败');
    } finally {
      setSaving(false);
    }
  }, [form, token]);

  const resolved = snapshot?.resolved;
  const config = snapshot?.config;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <PageHeader
          title="应用更新管理"
          subtitle="集中维护安卓安装包的版本、强更策略和下载地址，保存后前端启动检测会立即读取这份配置。"
          backLabel="返回设置"
          eyebrow="管理后台"
          onBack={() => router.back()}
        />

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusTitleGroup}>
              <View style={styles.statusIconBadge}>
                <RocketLaunch size={18} color={palette.orange500} weight="fill" />
              </View>
              <View style={styles.statusTextGroup}>
                <Text style={styles.cardTitle}>当前生效状态</Text>
                <Text style={styles.cardSubtitle}>
                  {config?.source === 'database'
                    ? '当前由数据库配置驱动，保存后会立即覆盖旧配置。'
                    : '当前仍在使用 .env 回退配置，第一次保存后将切到数据库配置。'}
                </Text>
              </View>
            </View>
            <View style={styles.sourcePill}>
              <Text style={styles.sourcePillText}>{config?.source === 'database' ? '数据库' : '.env 回退'}</Text>
            </View>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>版本状态</Text>
              <Text style={styles.statusValue}>{resolved?.update_enabled ? '已可用' : '未就绪'}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>下载方式</Text>
              <Text style={styles.statusValue}>
                {resolved?.download_mode === 'hosted'
                  ? '后端直出 APK'
                  : resolved?.download_mode === 'redirect'
                  ? '跳转外链'
                  : '未配置'}
              </Text>
            </View>
          </View>

          <View style={styles.statusMetaBlock}>
            <Text style={styles.statusMetaLabel}>最近更新时间</Text>
            <Text style={styles.statusMetaValue}>{formatDateTime(config?.updated_at)}</Text>
          </View>

          <View style={styles.statusMetaBlock}>
            <Text style={styles.statusMetaLabel}>当前解析结果</Text>
            <Text style={styles.statusMetaValue}>{resolved?.message || resolved?.download_url || '配置完整后，这里会显示实际下载地址。'}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={palette.orange500} />
            <Text style={styles.loadingText}>正在加载应用更新配置...</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <View style={styles.formSectionHeader}>
            <View style={styles.sectionBadge}>
              <Package size={16} color={palette.orange500} weight="fill" />
            </View>
            <View style={styles.sectionTextGroup}>
              <Text style={styles.cardTitle}>发布配置</Text>
              <Text style={styles.cardSubtitle}>安卓整包升级主要看构建号，版本号用于展示给用户。</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>最新版本号</Text>
            <TextInput
              style={styles.input}
              value={form.latestVersion}
              onChangeText={(value) => handleChange('latestVersion', value)}
              placeholder="例如 1.4.0"
              placeholderTextColor={palette.stone400}
            />
          </View>

          <View style={styles.inlineRow}>
            <View style={styles.inlineField}>
              <Text style={styles.inputLabel}>最新构建号</Text>
              <TextInput
                style={styles.input}
                value={form.latestBuild}
                onChangeText={(value) => handleChange('latestBuild', value)}
                placeholder="例如 42"
                keyboardType="number-pad"
                placeholderTextColor={palette.stone400}
              />
            </View>
            <View style={styles.inlineField}>
              <Text style={styles.inputLabel}>最低支持构建号</Text>
              <TextInput
                style={styles.input}
                value={form.minSupportedBuild}
                onChangeText={(value) => handleChange('minSupportedBuild', value)}
                placeholder="低于此值就强制更新"
                keyboardType="number-pad"
                placeholderTextColor={palette.stone400}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.cardTitleSmall}>是否强制更新</Text>
              <Text style={styles.cardSubtitle}>开启后，只要检测到新包就必须下载更新。</Text>
            </View>
            <Switch
              value={form.forceUpdate}
              onValueChange={(value) => handleChange('forceUpdate', value)}
              thumbColor={palette.white}
              trackColor={{ false: palette.stone300, true: palette.orange500 }}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>发布时间</Text>
            <TextInput
              style={styles.input}
              value={form.publishedAt}
              onChangeText={(value) => handleChange('publishedAt', value)}
              placeholder="例如 2026-04-29T09:30:00+08:00"
              placeholderTextColor={palette.stone400}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>更新说明</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={form.releaseNotesText}
              onChangeText={(value) => handleChange('releaseNotesText', value)}
              placeholder={'每行一条更新说明\n例如：\n优化推荐页体验\n修复活跃时间统计'}
              placeholderTextColor={palette.stone400}
              multiline
            />
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formSectionHeader}>
            <View style={styles.sectionBadge}>
              <ArrowSquareOut size={16} color={palette.orange500} weight="fill" />
            </View>
            <View style={styles.sectionTextGroup}>
              <Text style={styles.cardTitle}>下载配置</Text>
              <Text style={styles.cardSubtitle}>本地 APK 路径优先；若本地文件不存在，则回退到外链地址。</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>安卓 APK 下载外链</Text>
            <TextInput
              style={styles.input}
              value={form.androidApkUrl}
              onChangeText={(value) => handleChange('androidApkUrl', value)}
              placeholder="https://your-domain.com/sncp/sncp-v1.4.0.apk"
              placeholderTextColor={palette.stone400}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>服务器 APK 文件路径</Text>
            <TextInput
              style={styles.input}
              value={form.androidApkPath}
              onChangeText={(value) => handleChange('androidApkPath', value)}
              placeholder="/opt/sncp/releases/sncp-v1.4.0.apk 或 backend/releases/sncp-v1.4.0.apk"
              placeholderTextColor={palette.stone400}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>下载文件名</Text>
            <TextInput
              style={styles.input}
              value={form.androidDownloadName}
              onChangeText={(value) => handleChange('androidDownloadName', value)}
              placeholder="例如 sncp-v1.4.0.apk"
              placeholderTextColor={palette.stone400}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>iOS 跳转地址</Text>
            <TextInput
              style={styles.input}
              value={form.iosUrl}
              onChangeText={(value) => handleChange('iosUrl', value)}
              placeholder="例如 App Store 或 TestFlight 链接"
              placeholderTextColor={palette.stone400}
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formSectionHeader}>
            <View style={styles.sectionBadge}>
              <ClockClockwise size={16} color={palette.orange500} weight="fill" />
            </View>
            <View style={styles.sectionTextGroup}>
              <Text style={styles.cardTitle}>保存说明</Text>
              <Text style={styles.cardSubtitle}>保存后，`/api/update/check` 会优先读取这份数据库配置。</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color={palette.gold50} /> : <FloppyDiskBack size={18} color={palette.gold50} weight="fill" />}
            <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存更新配置'}</Text>
          </Pressable>

          {hintText ? <Text style={styles.hintText}>{hintText}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: palette.surface,
    },
    content: {
      padding: 20,
      gap: 16,
      paddingBottom: 40,
    },
    statusCard: {
      backgroundColor: palette.white,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 14,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    statusTitleGroup: {
      flexDirection: 'row',
      gap: 10,
      flex: 1,
    },
    statusIconBadge: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor: palette.gold50,
      borderWidth: 1,
      borderColor: palette.gold100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusTextGroup: {
      flex: 1,
      gap: 4,
    },
    sourcePill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    sourcePillText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.stone850,
    },
    statusGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    statusItem: {
      flex: 1,
      borderRadius: 18,
      padding: 14,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 6,
    },
    statusLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone500,
    },
    statusValue: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.stone850,
    },
    statusMetaBlock: {
      borderRadius: 18,
      padding: 14,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 8,
    },
    statusMetaLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone500,
    },
    statusMetaValue: {
      fontSize: 14,
      lineHeight: 21,
      color: palette.stone800,
    },
    loadingCard: {
      backgroundColor: palette.white,
      borderRadius: 22,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    loadingText: {
      fontSize: 14,
      color: palette.stone600,
    },
    formCard: {
      backgroundColor: palette.white,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 14,
    },
    formSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sectionBadge: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.gold50,
      borderWidth: 1,
      borderColor: palette.gold100,
    },
    sectionTextGroup: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: palette.stone900,
    },
    cardTitleSmall: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone900,
    },
    cardSubtitle: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone600,
    },
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone700,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: palette.surfaceWarm,
      color: palette.stone850,
      fontSize: 14,
    },
    multilineInput: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    inlineRow: {
      flexDirection: 'row',
      gap: 10,
    },
    inlineField: {
      flex: 1,
      gap: 8,
    },
    switchRow: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: palette.surfaceWarm,
      borderWidth: 1,
      borderColor: palette.stone100,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    switchTextGroup: {
      flex: 1,
      gap: 4,
    },
    primaryButton: {
      minHeight: 54,
      borderRadius: 18,
      backgroundColor: palette.stone900,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 18,
    },
    buttonDisabled: {
      opacity: 0.74,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '900',
      color: palette.gold50,
    },
    hintText: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone600,
    },
  });
}
