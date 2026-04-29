import { useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowSquareOut, DownloadSimple, RocketLaunch, ShieldWarning } from 'phosphor-react-native';

import { type Palette } from '@/constants/palette';
import { usePalette } from '@/hooks/use-palette';
import type { AndroidUpdateCheckResult } from '@/services/update';

type Props = {
  visible: boolean;
  update: AndroidUpdateCheckResult | null;
  opening: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

function formatVersionLabel(version: string | null, build: number | null) {
  const versionText = version ? `v${version}` : '未知版本';
  if (build === null || build <= 0) {
    return versionText;
  }
  return `${versionText} · build ${build}`;
}

export function AppUpdateModal({ visible, update, opening, onConfirm, onDismiss }: Props) {
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  if (!visible || !update) {
    return null;
  }

  const releaseNotes = update.releaseNotes.length
    ? update.releaseNotes
    : ['发现新的安卓安装包，可下载后覆盖安装。'];

  return (
    <Modal transparent animationType="fade" visible={visible} statusBarTranslucent>
      <View style={styles.overlay}>
        {!update.mustUpdate ? <Pressable style={styles.backdropTap} onPress={onDismiss} /> : null}
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, update.mustUpdate ? styles.badgeDanger : styles.badgeWarm]}>
              {update.mustUpdate ? (
                <ShieldWarning size={14} color={palette.imperial500} weight="fill" />
              ) : (
                <RocketLaunch size={14} color={palette.orange500} weight="fill" />
              )}
              <Text style={[styles.badgeText, update.mustUpdate ? styles.badgeTextDanger : null]}>
                {update.mustUpdate ? '需要升级' : '发现新版本'}
              </Text>
            </View>
            <View style={styles.versionPill}>
              <Text style={styles.versionPillText}>{update.latestVersion ? `v${update.latestVersion}` : '新版本'}</Text>
            </View>
          </View>

          <Text style={styles.title}>{update.mustUpdate ? '需要更新安装包' : '检测到新的安装包'}</Text>
          <Text style={styles.subtitle}>
            {update.mustUpdate
              ? '当前版本已低于最低支持版本，请下载新安装包后继续使用。'
              : '已有新版本可下载，安装后即可使用最新能力。'}
          </Text>

          <View style={styles.versionPanel}>
            <View style={styles.versionBlock}>
              <Text style={styles.versionLabel}>当前</Text>
              <Text style={styles.versionValue}>
                {formatVersionLabel(update.currentVersion, update.currentBuild)}
              </Text>
            </View>
            <View style={styles.versionDivider} />
            <View style={styles.versionBlock}>
              <Text style={styles.versionLabel}>最新</Text>
              <Text style={styles.versionValue}>
                {formatVersionLabel(update.latestVersion, update.latestBuild)}
              </Text>
            </View>
          </View>

          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <DownloadSimple size={16} color={palette.orange500} weight="fill" />
              <Text style={styles.notesTitle}>更新内容</Text>
            </View>
            <ScrollView style={styles.notesList} contentContainerStyle={styles.notesContent} showsVerticalScrollIndicator={false}>
              {releaseNotes.map((note, index) => (
                <View key={`${note}-${index}`} style={styles.noteRow}>
                  <View style={styles.noteDot} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.actionRow}>
            {!update.mustUpdate ? (
              <Pressable style={styles.secondaryButton} onPress={onDismiss} disabled={opening}>
                <Text style={styles.secondaryButtonText}>稍后再说</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.primaryButton, update.mustUpdate ? styles.primaryButtonWide : null]}
              onPress={onConfirm}
              disabled={opening}
            >
              {opening ? (
                <ActivityIndicator size="small" color={palette.stone900} />
              ) : (
                <ArrowSquareOut size={16} color={palette.stone900} weight="bold" />
              )}
              <Text style={styles.primaryButtonText}>{opening ? '正在打开' : '立即下载'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(10, 8, 7, 0.58)',
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    backdropTap: {
      ...StyleSheet.absoluteFillObject,
    },
    card: {
      borderRadius: 28,
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.white,
      gap: 16,
      shadowColor: palette.orange500,
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },
    badgeWarm: {
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
    },
    badgeDanger: {
      borderColor: palette.imperial100,
      backgroundColor: palette.imperial50,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.orange500,
    },
    badgeTextDanger: {
      color: palette.imperial500,
    },
    versionPill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.surfaceWarm,
    },
    versionPillText: {
      fontSize: 12,
      fontWeight: '800',
      color: palette.stone850,
    },
    title: {
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '900',
      color: palette.stone900,
    },
    subtitle: {
      marginTop: -8,
      fontSize: 14,
      lineHeight: 22,
      color: palette.stone600,
    },
    versionPanel: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.surfaceWarm,
      overflow: 'hidden',
    },
    versionBlock: {
      flex: 1,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 6,
    },
    versionDivider: {
      width: 1,
      backgroundColor: palette.stone100,
    },
    versionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: palette.stone500,
    },
    versionValue: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '800',
      color: palette.stone850,
    },
    notesCard: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: palette.gold100,
      backgroundColor: palette.gold50,
      padding: 16,
      gap: 12,
      maxHeight: 220,
    },
    notesHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    notesTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: palette.orange500,
    },
    notesList: {
      flexGrow: 0,
    },
    notesContent: {
      gap: 10,
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    noteDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      marginTop: 7,
      backgroundColor: palette.orange500,
      flexShrink: 0,
    },
    noteText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 21,
      color: palette.stone800,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 12,
    },
    secondaryButton: {
      height: 52,
      paddingHorizontal: 18,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.surfaceWarm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: '800',
      color: palette.stone700,
    },
    primaryButton: {
      minWidth: 148,
      height: 52,
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: palette.orange500,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    primaryButtonWide: {
      flex: 1,
    },
    primaryButtonText: {
      fontSize: 15,
      fontWeight: '900',
      color: palette.stone900,
    },
  });
}
