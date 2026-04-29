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
  publishedYear: string;
  publishedMonth: string;
  publishedDay: string;
  publishedTime: string;
  releaseNotesText: string;
  androidApkUrl: string;
  androidApkPath: string;
  androidDownloadName: string;
  iosUrl: string;
};

type FieldLevel = 'required' | 'optional' | 'conditional';

const EMPTY_FORM: FormState = {
  latestVersion: '',
  latestBuild: '',
  minSupportedBuild: '',
  forceUpdate: false,
  publishedYear: '',
  publishedMonth: '',
  publishedDay: '',
  publishedTime: '',
  releaseNotesText: '',
  androidApkUrl: '',
  androidApkPath: '',
  androidDownloadName: '',
  iosUrl: '',
};

function splitPublishedAt(value?: string | null) {
  if (!value) {
    return {
      publishedYear: '',
      publishedMonth: '',
      publishedDay: '',
      publishedTime: '',
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return {
      publishedYear: '',
      publishedMonth: '',
      publishedDay: '',
      publishedTime: '',
    };
  }

  return {
    publishedYear: String(date.getFullYear()),
    publishedMonth: String(date.getMonth() + 1).padStart(2, '0'),
    publishedDay: String(date.getDate()).padStart(2, '0'),
    publishedTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
}

function clampReleaseNotesInput(value: string) {
  return value
    .replace(/\r/g, '')
    .split('\n')
    .slice(0, 3)
    .join('\n');
}

function mapResponseToForm(result: AdminAppUpdateResponse): FormState {
  const { config } = result;
  const published = splitPublishedAt(config.published_at);
  return {
    latestVersion: config.latest_version || '',
    latestBuild: config.latest_build > 0 ? String(config.latest_build) : '',
    minSupportedBuild: config.min_supported_build > 0 ? String(config.min_supported_build) : '',
    forceUpdate: Boolean(config.force_update),
    ...published,
    releaseNotesText: clampReleaseNotesInput((config.release_notes || []).join('\n')),
    androidApkUrl: config.android_apk_url || '',
    androidApkPath: config.android_apk_path || '',
    androidDownloadName: config.android_download_name || '',
    iosUrl: config.ios_url || '',
  };
}

function normalizeReleaseNotes(value: string) {
  return clampReleaseNotesInput(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPublishedAt(form: FormState) {
  const year = form.publishedYear.trim();
  const month = form.publishedMonth.trim();
  const day = form.publishedDay.trim();
  const time = form.publishedTime.trim();

  const hasAnyValue = Boolean(year || month || day || time);
  if (!hasAnyValue) {
    return null;
  }

  if (!year || !month || !day || !time) {
    throw new Error('请完整填写发布时间的年、月、日和时间');
  }

  if (!/^\d{4}$/.test(year)) {
    throw new Error('发布时间年份必须是 4 位数字');
  }
  if (!/^\d{1,2}$/.test(month)) {
    throw new Error('发布时间月份格式不正确');
  }
  if (!/^\d{1,2}$/.test(day)) {
    throw new Error('发布时间日期格式不正确');
  }

  const timeMatch = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    throw new Error('发布时间请按 HH:mm 格式填写，例如 09:30');
  }

  const yearNum = Number(year);
  const monthNum = Number(month);
  const dayNum = Number(day);
  const hourNum = Number(timeMatch[1]);
  const minuteNum = Number(timeMatch[2]);

  if (monthNum < 1 || monthNum > 12) {
    throw new Error('发布时间月份必须在 1 到 12 之间');
  }
  if (hourNum < 0 || hourNum > 23 || minuteNum < 0 || minuteNum > 59) {
    throw new Error('发布时间时间必须在 00:00 到 23:59 之间');
  }

  const date = new Date(Date.UTC(yearNum, monthNum - 1, dayNum, hourNum, minuteNum));
  if (
    date.getUTCFullYear() !== yearNum ||
    date.getUTCMonth() + 1 !== monthNum ||
    date.getUTCDate() !== dayNum
  ) {
    throw new Error('发布时间日期不存在，请检查年、月、日');
  }

  return `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}T${String(hourNum).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}:00+08:00`;
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

function hasPathSeparator(value: string) {
  return value.includes('/') || value.includes('\\');
}

function buildPayload(form: FormState, fixedReleaseDir?: string | null): SaveAdminAppUpdatePayload {
  return {
    latest_version: form.latestVersion.trim() || null,
    latest_build: parseNonNegativeInt(form.latestBuild),
    min_supported_build: parseNonNegativeInt(form.minSupportedBuild),
    force_update: form.forceUpdate,
    published_at: buildPublishedAt(form),
    release_notes: normalizeReleaseNotes(form.releaseNotesText),
    android_apk_url: form.androidApkUrl.trim() || null,
    android_apk_path: fixedReleaseDir ? null : form.androidApkPath.trim() || null,
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

function getFieldLevelMeta(level: FieldLevel) {
  switch (level) {
    case 'required':
      return {
        label: '必填',
        tone: 'required' as const,
      };
    case 'conditional':
      return {
        label: '二选一',
        tone: 'conditional' as const,
      };
    default:
      return {
        label: '选填',
        tone: 'optional' as const,
      };
  }
}

function validateForm(form: FormState, fixedReleaseDir?: string | null) {
  if (!form.latestVersion.trim()) {
    throw new Error('请填写最新版本号');
  }

  const latestBuild = parseNonNegativeInt(form.latestBuild);
  if (latestBuild <= 0) {
    throw new Error('请填写大于 0 的最新构建号');
  }

  const minSupportedBuild = parseNonNegativeInt(form.minSupportedBuild);
  if (minSupportedBuild > latestBuild) {
    throw new Error('最低支持构建号不能大于最新构建号');
  }

  buildPublishedAt(form);

  const downloadName = form.androidDownloadName.trim();
  if (downloadName && hasPathSeparator(downloadName)) {
    throw new Error('下载文件名只需要填写文件名，不要包含目录路径');
  }

  if (!form.androidApkUrl.trim() && fixedReleaseDir && !downloadName) {
    throw new Error('请填写下载文件名，后台会在固定目录中查找该 APK');
  }

  if (!form.androidApkUrl.trim() && !fixedReleaseDir && !form.androidApkPath.trim()) {
    throw new Error('安卓 APK 下载外链和服务器 APK 文件路径至少填写一项');
  }
}

function renderFieldLabel(styles: ReturnType<typeof createStyles>, title: string, level: FieldLevel, helper: string) {
  const meta = getFieldLevelMeta(level);
  const badgeStyle =
    meta.tone === 'required'
      ? styles.requiredBadge
      : meta.tone === 'conditional'
      ? styles.conditionalBadge
      : styles.optionalBadge;
  const badgeTextStyle =
    meta.tone === 'required'
      ? styles.requiredBadgeText
      : meta.tone === 'conditional'
      ? styles.conditionalBadgeText
      : styles.optionalBadgeText;

  return (
    <View style={styles.fieldHeader}>
      <View style={styles.fieldTitleRow}>
        <Text style={styles.inputLabel}>{title}</Text>
        <View style={[styles.fieldBadge, badgeStyle]}>
          <Text style={[styles.fieldBadgeText, badgeTextStyle]}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.fieldHelper}>{helper}</Text>
    </View>
  );
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

  const handleReleaseNotesChange = useCallback((value: string) => {
    handleChange('releaseNotesText', clampReleaseNotesInput(value));
  }, [handleChange]);

  const config = snapshot?.config;
  const resolved = snapshot?.resolved;
  const fixedReleaseDir = config?.android_release_dir || null;

  const handleSave = useCallback(async () => {
    if (!token) {
      setHintText('请先登录后再进入应用更新管理');
      return;
    }

    let payload: SaveAdminAppUpdatePayload;
    try {
      validateForm(form, fixedReleaseDir);
      payload = buildPayload(form, fixedReleaseDir);
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
  }, [fixedReleaseDir, form, token]);

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

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>这部分必须完成什么</Text>
            <Text style={styles.tipText}>最新版本号和最新构建号是必填。构建号就是安卓安装包的 `versionCode`，每发一个新 APK 都要比上一个更大。</Text>
          </View>

          <View style={styles.inputGroup}>
            {renderFieldLabel(
              styles,
              '最新版本号',
              'required',
              '给用户看的展示版本，例如 1.4.0。',
            )}
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
              {renderFieldLabel(
                styles,
                '最新构建号',
                'required',
                '程序判断新包用的整数构建号。',
              )}
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
              {renderFieldLabel(
                styles,
                '最低支持构建号',
                'optional',
                '低于此构建号的旧包会强制更新。',
              )}
              <TextInput
                style={styles.input}
                value={form.minSupportedBuild}
                onChangeText={(value) => handleChange('minSupportedBuild', value)}
                placeholder="例如 41"
                keyboardType="number-pad"
                placeholderTextColor={palette.stone400}
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchTextGroup}>
              <Text style={styles.cardTitleSmall}>是否强制更新</Text>
              <Text style={styles.cardSubtitle}>选填。开启后，只要检测到比当前包更新的安装包，就必须下载更新。</Text>
            </View>
            <Switch
              value={form.forceUpdate}
              onValueChange={(value) => handleChange('forceUpdate', value)}
              thumbColor={palette.white}
              trackColor={{ false: palette.stone300, true: palette.orange500 }}
            />
          </View>

          <View style={styles.inputGroup}>
            {renderFieldLabel(
              styles,
              '发布时间',
              'optional',
              '按年、月、日、时间填写。留空则不展示发布时间。',
            )}
            <View style={styles.publishedRow}>
              <TextInput
                style={[styles.input, styles.publishedYearInput]}
                value={form.publishedYear}
                onChangeText={(value) => handleChange('publishedYear', value)}
                placeholder="年"
                keyboardType="number-pad"
                placeholderTextColor={palette.stone400}
                maxLength={4}
              />
              <TextInput
                style={[styles.input, styles.publishedSmallInput]}
                value={form.publishedMonth}
                onChangeText={(value) => handleChange('publishedMonth', value)}
                placeholder="月"
                keyboardType="number-pad"
                placeholderTextColor={palette.stone400}
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.publishedSmallInput]}
                value={form.publishedDay}
                onChangeText={(value) => handleChange('publishedDay', value)}
                placeholder="日"
                keyboardType="number-pad"
                placeholderTextColor={palette.stone400}
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.publishedTimeInput]}
                value={form.publishedTime}
                onChangeText={(value) => handleChange('publishedTime', value)}
                placeholder="时间"
                placeholderTextColor={palette.stone400}
                maxLength={5}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            {renderFieldLabel(
              styles,
              '更新说明',
              'optional',
              '建议填写。每行一条，最多 3 行，弹窗里会直接展示给用户看。',
            )}
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={form.releaseNotesText}
              onChangeText={handleReleaseNotesChange}
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
              <Text style={styles.cardSubtitle}>
                {fixedReleaseDir
                  ? '当前已固定服务器 APK 目录，优先从该目录查找文件；也可备用外链回退。'
                  : '本地 APK 路径优先；若本地文件不存在，则回退到外链地址。'}
              </Text>
            </View>
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>{fixedReleaseDir ? '现在怎么填最省事' : '这部分至少填一项'}</Text>
            <Text style={styles.tipText}>
              {fixedReleaseDir
                ? `你已经启用了固定目录模式。把 APK 上传到 ${fixedReleaseDir}，这里再填写 APK 文件名即可；如果还想保底，也可以同时填一个外链下载地址。`
                : '“安卓 APK 下载外链”和“服务器 APK 文件路径”二选一至少填写一项。最稳的是填服务器上的 APK 文件路径，让当前后端直接提供下载。'}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            {renderFieldLabel(
              styles,
              '安卓 APK 下载外链',
              'conditional',
              '如果你把 APK 放在 OSS、CDN 或下载站，这里填完整的 HTTPS 下载地址。',
            )}
            <TextInput
              style={styles.input}
              value={form.androidApkUrl}
              onChangeText={(value) => handleChange('androidApkUrl', value)}
              placeholder="https://your-domain.com/sncp/sncp-v1.4.0.apk"
              placeholderTextColor={palette.stone400}
              autoCapitalize="none"
            />
          </View>

          {fixedReleaseDir ? (
            <View style={styles.inputGroup}>
              {renderFieldLabel(
                styles,
                '固定服务器目录',
                'required',
                '这个目录由后端固定提供，当前页面不能修改。你只需要把 APK 上传到这里，再填写下面的 APK 文件名。',
              )}
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyFieldValue}>{fixedReleaseDir}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.inputGroup}>
              {renderFieldLabel(
                styles,
                '服务器 APK 文件路径',
                'conditional',
                '如果你让当前 Flask 后端直接托管 APK，这里填服务器上的实际文件路径，例如 /opt/sncp/releases/sncp-v1.4.0.apk。',
              )}
              <TextInput
                style={styles.input}
                value={form.androidApkPath}
                onChangeText={(value) => handleChange('androidApkPath', value)}
                placeholder="/opt/sncp/releases/sncp-v1.4.0.apk 或 backend/releases/sncp-v1.4.0.apk"
                placeholderTextColor={palette.stone400}
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            {renderFieldLabel(
              styles,
              fixedReleaseDir ? 'APK 文件名' : '下载文件名',
              fixedReleaseDir ? 'required' : 'optional',
              fixedReleaseDir
                ? '这里只填文件名，不要带目录路径。例如 sncp-v1.4.0.apk。'
                : '建议填写。用户下载时看到的文件名，例如 sncp-v1.4.0.apk。',
            )}
            <TextInput
              style={styles.input}
              value={form.androidDownloadName}
              onChangeText={(value) => handleChange('androidDownloadName', value)}
              placeholder="例如 sncp-v1.4.0.apk"
              placeholderTextColor={palette.stone400}
            />
          </View>

          <View style={styles.inputGroup}>
            {renderFieldLabel(
              styles,
              'iOS 跳转地址',
              'optional',
              '安卓更新用不到，后续如果上架 iOS，可填 App Store 或 TestFlight 链接。',
            )}
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
              <Text style={styles.cardSubtitle}>保存后，`/api/update/check` 会优先读取这份数据库配置；数据库没配置过时，才会回退到 `.env`。</Text>
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
    tipCard: {
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: palette.gold50,
      borderWidth: 1,
      borderColor: palette.gold100,
      gap: 6,
    },
    tipTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: palette.orange500,
    },
    tipText: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone700,
    },
    inputGroup: {
      gap: 8,
    },
    fieldHeader: {
      gap: 6,
      minHeight: 62,
    },
    fieldTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    inputLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone700,
    },
    fieldBadge: {
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
    },
    requiredBadge: {
      backgroundColor: palette.imperial50,
      borderColor: palette.imperial100,
    },
    conditionalBadge: {
      backgroundColor: palette.gold50,
      borderColor: palette.gold100,
    },
    optionalBadge: {
      backgroundColor: palette.surfaceWarm,
      borderColor: palette.stone100,
    },
    fieldBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    requiredBadgeText: {
      color: palette.imperial600,
    },
    conditionalBadgeText: {
      color: palette.orange500,
    },
    optionalBadgeText: {
      color: palette.stone600,
    },
    fieldHelper: {
      fontSize: 12,
      lineHeight: 18,
      color: palette.stone500,
      minHeight: 36,
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
    readOnlyField: {
      borderWidth: 1,
      borderColor: palette.gold100,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: palette.gold50,
    },
    readOnlyFieldValue: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone850,
    },
    multilineInput: {
      minHeight: 92,
      textAlignVertical: 'top',
    },
    publishedRow: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'stretch',
    },
    publishedYearInput: {
      flex: 1.2,
      textAlign: 'center',
    },
    publishedSmallInput: {
      flex: 0.75,
      textAlign: 'center',
    },
    publishedTimeInput: {
      flex: 1,
      textAlign: 'center',
    },
    inlineRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'stretch',
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
