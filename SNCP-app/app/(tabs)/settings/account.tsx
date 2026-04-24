import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Camera } from 'phosphor-react-native';

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarImagePayload, setAvatarImagePayload] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState('');
  const hasPickedAvatarRef = useRef(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchMyAccount(token)
      .then((res) => {
        setDisplayName(res.display_name || '');
        setPhone(res.phone || '');
        if (!hasPickedAvatarRef.current) {
          setAvatarUrl(res.avatar_url || null);
        }
      })
      .catch((error) => {
        console.error('[Account] load failed', error);
        setErrorText('加载个人信息失败，请稍后重试');
      });
  }, [token]);

  const avatarSeed = (displayName || phone || '我').trim();
  const avatarText = avatarSeed.slice(0, 1).toUpperCase();

  const displayAvatarUrl = avatarPreviewUrl || avatarUrl;

  const handlePickAvatar = async () => {
    setErrorText('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorText('需要相册权限才能选择头像');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });
    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.base64) {
      setErrorText('头像读取失败，请重新选择');
      return;
    }

    const mimeType = asset.mimeType || 'image/jpeg';
    const payload = `data:${mimeType};base64,${asset.base64}`;
    hasPickedAvatarRef.current = true;
    setAvatarPreviewUrl(asset.uri);
    setAvatarImagePayload(payload);
  };

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
      const res = await updateMyAccount(
        {
          display_name: nextName,
          ...(avatarImagePayload ? { avatar_image: avatarImagePayload } : {}),
        },
        token,
      );
      await setUserProfileRaw(
        JSON.stringify({
          id: res.user.id,
          phone: res.user.phone,
          display_name: res.user.display_name,
          roles: res.user.roles || [],
          avatar_url: res.user.avatar_url || displayAvatarUrl || null,
        }),
      );
      setAvatarUrl(res.user.avatar_url || displayAvatarUrl || null);
      setAvatarPreviewUrl(null);
      hasPickedAvatarRef.current = false;
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
          <View style={styles.avatarSection}>
            <Pressable
              style={({ pressed }) => [styles.avatarPicker, pressed && styles.avatarPickerPressed]}
              onPress={handlePickAvatar}
              accessibilityRole="button"
              accessibilityLabel="选择头像"
            >
              {displayAvatarUrl ? (
                <Image source={{ uri: displayAvatarUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{avatarText}</Text>
              )}
              <View style={styles.avatarCameraBadge}>
                <Camera size={16} color={palette.white} weight="bold" />
              </View>
            </Pressable>
            <View style={styles.avatarTextGroup}>
              <Text style={styles.avatarTitle}>头像</Text>
              <Text style={styles.avatarHint}>选择后会压缩裁剪再保存</Text>
            </View>
          </View>
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
          <Text style={styles.helperText}>当前支持修改头像和昵称，手机号暂不支持修改。</Text>
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
      gap: 14,
    },
    avatarSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingBottom: 4,
    },
    avatarPicker: {
      width: 76,
      height: 76,
      borderRadius: 999,
      backgroundColor: palette.surfaceWarm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: palette.stone100,
      position: 'relative',
      overflow: 'visible',
    },
    avatarPickerPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    avatarImage: {
      width: '100%',
      height: '100%',
      borderRadius: 999,
    },
    avatarText: {
      fontSize: 28,
      fontWeight: '800',
      color: palette.stone800,
    },
    avatarCameraBadge: {
      position: 'absolute',
      right: -2,
      bottom: 2,
      width: 28,
      height: 28,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.orange500,
      borderWidth: 2,
      borderColor: palette.white,
    },
    avatarTextGroup: {
      flex: 1,
      gap: 4,
    },
    avatarTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: palette.stone850,
    },
    avatarHint: {
      fontSize: 12,
      color: palette.stone500,
      lineHeight: 17,
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
