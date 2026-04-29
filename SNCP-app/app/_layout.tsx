import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppUpdateModal } from '@/components/app-update-modal';
import { useAuthTokenState } from '@/hooks/use-auth-token';
import { reportExitActivityIfNeeded, reportLaunchActivityIfNeeded, resetRuntimeActivityTracking } from '@/services/activity';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { refreshSessionOnForeground } from '@/services/auth';
import {
  type AndroidUpdateCheckResult,
  checkAndroidAppUpdate,
  openAndroidUpdateDownload,
  shouldCheckForAppUpdate,
} from '@/services/update';

function shouldTrackAppActivity(segments: string[]) {
  if (!segments.length || segments[0] !== '(tabs)') {
    return false;
  }
  const activeTab = segments[1] ?? 'index';
  return activeTab === 'index' || activeTab === 'record' || activeTab === 'recommend';
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const { token, isLoading } = useAuthTokenState();
  const [pendingUpdate, setPendingUpdate] = useState<AndroidUpdateCheckResult | null>(null);
  const [openingUpdate, setOpeningUpdate] = useState(false);
  const updateCheckedRef = useRef(false);

  useEffect(() => {
    const refreshIfActive = () => {
      void refreshSessionOnForeground();
    };

    refreshIfActive();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshIfActive();
        return;
      }

      if ((state === 'inactive' || state === 'background') && token) {
        void reportExitActivityIfNeeded(token, 'background');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      resetRuntimeActivityTracking();
      return;
    }
    if (isLoading || !shouldTrackAppActivity(segments)) {
      return;
    }
    void reportLaunchActivityIfNeeded(token);
  }, [isLoading, segments, token]);

  useEffect(() => {
    if (isLoading) return;
    if (!segments.length) return;

    const first = segments[0];
    const inAuth = first === 'login' || first === 'register';

    if (!token && !inAuth) {
      router.replace('/login');
      return;
    }

    if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isLoading, router, segments, token]);

  useEffect(() => {
    if (isLoading || updateCheckedRef.current || !shouldCheckForAppUpdate()) {
      return;
    }

    updateCheckedRef.current = true;
    let cancelled = false;

    const checkUpdate = async () => {
      try {
        const result = await checkAndroidAppUpdate();
        if (
          cancelled ||
          !result?.updateEnabled ||
          !result.downloadUrl ||
          !result.shouldUpdate
        ) {
          return;
        }
        setPendingUpdate(result);
      } catch (error) {
        console.warn('Failed to check app update:', error);
      }
    };

    void checkUpdate();

    return () => {
      cancelled = true;
    };
  }, [isLoading]);

  const handleDismissUpdate = () => {
    if (pendingUpdate?.mustUpdate || openingUpdate) {
      return;
    }
    setPendingUpdate(null);
  };

  const handleOpenUpdate = async () => {
    if (!pendingUpdate?.downloadUrl || openingUpdate) {
      return;
    }

    setOpeningUpdate(true);
    try {
      await openAndroidUpdateDownload(pendingUpdate.downloadUrl);
      if (!pendingUpdate.mustUpdate) {
        setPendingUpdate(null);
      }
    } catch (error) {
      console.error('Failed to open update url:', error);
      Alert.alert('无法打开下载链接', '请稍后重试，或联系管理员确认安装包下载地址。');
    } finally {
      setOpeningUpdate(false);
    }
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ai-recognize" options={{ headerShown: false }} />
        <Stack.Screen name="meal-history" options={{ headerShown: false }} />
        <Stack.Screen name="recipes/[postId]" options={{ headerShown: false }} />
      </Stack>
      <AppUpdateModal
        visible={Boolean(pendingUpdate)}
        update={pendingUpdate}
        opening={openingUpdate}
        onConfirm={() => void handleOpenUpdate()}
        onDismiss={handleDismissUpdate}
      />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
