import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { colors } from '@/constants/palette';
import { shadows } from '@/constants/shadows';
import { getApiBaseUrl } from '@/services/api';
import { setAuthToken } from '@/hooks/use-auth-token';
import { setRefreshToken, setUserProfileRaw } from '@/storage/auth-storage';
import { DISPLAY_NAME_MAX_UNITS, getDisplayNameUnits, trimDisplayNameToMax } from '@/utils/display-name';

export default function RegisterScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBaseUrl = getApiBaseUrl();
  const displayNameUnits = getDisplayNameUnits(displayName.trim());

  const handleRegister = async () => {
    if (!phone.trim() || !password) {
      setError('请输入手机号和密码');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const resp = await fetch(`${apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password, display_name: displayName.trim() || undefined }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data?.error || '注册失败，请检查输入信息');
        return;
      }

      await setRefreshToken(data.refresh_token || null);
      await setUserProfileRaw(JSON.stringify(data.user || {}));
      await setAuthToken(data.access_token || null);
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[Register] failed:', err);
      setError('网络异常，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="login" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandBlock}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="account-heart" size={28} color={colors.gold50} />
            </View>
            <Text style={styles.title}>
              新用户{'\n'}
              <Text style={styles.titleAccent}>注册</Text>
            </Text>
            <Text style={styles.subtitle}>开启你的膳食记录</Text>
          </View>

          <View style={styles.formBlock}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>手机号</Text>
              <View style={styles.inputShell}>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="请输入手机号"
                  placeholderTextColor={colors.stone500}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>昵称</Text>
              <View style={styles.inputShell}>
                <TextInput
                  value={displayName}
                  onChangeText={(value) => setDisplayName(trimDisplayNameToMax(value))}
                  placeholder="可填写姓名或称呼"
                  placeholderTextColor={colors.stone500}
                  style={styles.input}
                />
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>
                    {displayNameUnits}/{DISPLAY_NAME_MAX_UNITS}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>密码</Text>
              <View style={styles.inputShell}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="请输入密码"
                  placeholderTextColor={colors.stone500}
                  secureTextEntry
                  style={styles.input}
                />
              </View>
            </View>

            <Pressable
              onPress={handleRegister}
              style={({ pressed }) => [
                styles.loginButton,
                isSubmitting && styles.loginButtonDisabled,
                pressed && styles.loginButtonPressed,
              ]}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={colors.gold400} />
                  <Text style={styles.loginButtonText}>注册中...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>完成注册</Text>
                  <View style={styles.loginButtonIcon}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.gold400} />
                  </View>
                </>
              )}
            </Pressable>
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable style={styles.linkRow} onPress={() => router.replace('/login')}>
              <Text style={styles.linkText}>已有账号？去登录</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 44,
    paddingBottom: 72,
    justifyContent: 'flex-start',
  },
  brandBlock: {
    gap: 12,
    marginBottom: 32,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.gold500,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...shadows.logo,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.stone900,
    lineHeight: 46,
  },
  titleAccent: {
    color: colors.green500,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.stone500,
    fontSize: 16,
    fontWeight: '600',
  },
  formBlock: {
    gap: 18,
    paddingBottom: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.stone600,
    letterSpacing: 1,
  },
  inputShell: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 20,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...shadows.softSubtle,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: colors.stone900,
    fontWeight: '500',
  },
  counterBadge: {
    minWidth: 46,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 140, 66, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 140, 66, 0.16)',
  },
  counterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.orange500,
  },
  loginButton: {
    height: 64,
    backgroundColor: colors.stone900,
    borderRadius: 32,
    paddingLeft: 28,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.stone800,
    ...shadows.primary,
  },
  loginButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  loginButtonDisabled: {
    opacity: 0.8,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: colors.gold50,
    fontSize: 18,
    fontWeight: '700',
  },
  loginButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkRow: {
    marginTop: 10,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.blue500,
  },
  errorText: {
    color: colors.imperial600,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
