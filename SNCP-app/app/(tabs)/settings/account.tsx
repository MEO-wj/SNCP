import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';
import { fetchMyAccount, updateMyAccount } from '@/services/account';
import { setUserProfileRaw } from '@/storage/auth-storage';

export default function AccountDetailScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette, isDark), [isDark, palette]);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchMyAccount(token)
      .then((res) => {
        setDisplayName(res.display_name || '');
        setPhone(res.phone || '');
      })
      .catch((error) => {
        console.error('[Account] load failed', error);
        setErrorText('加载个人信息失败，请稍后重试');
      });
  }, [token]);

  const handleSave = async () => {
    if (!token) {
      return;
    }
    const nextName = displayName.trim();
    if (!nextName) {
      setErrorText('昵称不能为空');
      return;
    }

    setSaving(true);
    setErrorText('');
    try {
      const res = await updateMyAccount({ display_name: nextName }, token);
      await setUserProfileRaw(
        JSON.stringify({
          id: res.user.id,
          phone: res.user.phone,
          display_name: res.user.display_name,
          roles: res.user.roles || [],
        }),
      );
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存失败，请稍后重试';
      setErrorText(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>个人信息</Text>

        <View style={styles.card}>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>手机号</Text>
            <TextInput value={phone} editable={false} style={[styles.formInput, styles.disabledInput]} />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>昵称</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.formInput}
              maxLength={30}
              placeholder="请输入昵称"
              placeholderTextColor={palette.stone400}
            />
          </View>
          <Text style={styles.helperText}>当前支持修改昵称，手机号暂不支持修改。</Text>
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存信息'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: Palette, isDark: boolean) {
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
    backText: {
      color: palette.blue500,
      fontSize: 14,
      fontWeight: '600',
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: palette.stone900,
    },
    card: {
      backgroundColor: palette.white,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 10,
    },
    formRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    formLabel: {
      width: 68,
      fontSize: 14,
      color: palette.stone600,
    },
    formInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: palette.stone800,
      backgroundColor: palette.surfaceWarm,
    },
    disabledInput: {
      color: palette.stone500,
      backgroundColor: palette.stone100,
    },
    helperText: {
      marginTop: 2,
      fontSize: 12,
      color: palette.stone500,
    },
    errorText: {
      marginTop: 2,
      fontSize: 12,
      color: palette.imperial500,
    },
    primaryButton: {
      backgroundColor: isDark ? palette.orange500 : palette.stone900,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: isDark ? palette.surface : palette.gold50,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
