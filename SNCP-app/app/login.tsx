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
import { setAuthToken } from '@/hooks/use-auth-token';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getApiBaseUrl } from '@/services/api';
import { setRefreshToken, setUserProfileRaw } from '@/storage/auth-storage';

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBaseUrl = getApiBaseUrl();

  const handleLogin = async () => {
    if (!phone.trim() || !password) {
      setError('请输入手机号和密码');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const resp = await fetch(`${apiBaseUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });

      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        setError(data?.error || '登录失败，请检查手机号或密码');
        return;
      }

      await setRefreshToken(data?.refresh_token || null);
      await setUserProfileRaw(JSON.stringify(data?.user || {}));
      await setAuthToken(data?.access_token || null);

      router.replace('/(tabs)');
    } catch (err) {
      console.error('[Login] 登录异常:', err);
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
              <MaterialCommunityIcons name="silverware-fork-knife" size={28} color={colors.gold50} />
            </View>
            <Text style={[styles.title, isDark && styles.titleDark]}>
              柠芯{'\n'}
              <Text style={styles.titleAccent}>食伴</Text>
            </Text>
            <Text style={styles.subtitle}>记录饮食 · 守护营养</Text>
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
                  keyboardType="default"
                  autoCapitalize="none"
                  style={styles.input}
                />
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
              onPress={handleLogin}
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
                  <Text style={styles.loginButtonText}>登录中...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.loginButtonText}>登录</Text>
                  <View style={styles.loginButtonIcon}>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.gold400} />
                  </View>
                </>
              )}
            </Pressable>
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable style={styles.linkRow} onPress={() => router.push({ pathname: '/register' })}>
              <Text style={styles.linkText}>没有账号？去注册</Text>
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
    marginBottom: 36,
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
    fontSize: 42,
    fontWeight: '800',
    color: colors.stone900,
    lineHeight: 46,
    letterSpacing: -1,
  },
  titleDark: {
    color: '#F6F2EE',
  },
  titleAccent: {
    color: colors.green500,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.stone500,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    ...shadows.softSubtle,
  },
  input: {
    height: 48,
    fontSize: 15,
    color: colors.stone900,
    fontWeight: '500',
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
