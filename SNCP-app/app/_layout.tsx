import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AppUpdateModal } from '@/components/app-update-modal';
import { useAuthTokenState } from '@/hooks/use-auth-token';
import { reportExitActivityIfNeeded, reportLaunchActivityIfNeeded, reportLogoutActivityIfNeeded, resetRuntimeActivityTracking } from '@/services/activity';
import { revokeAdminAppUpdate } from '@/services/admin-dashboard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { refreshSessionOnForeground } from '@/services/auth';
import { clearAuthStorage, getUserProfileRaw } from '@/storage/auth-storage';
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
  const { token, isLoading, setAuthToken } = useAuthTokenState();
  const [pendingUpdate, setPendingUpdate] = useState<AndroidUpdateCheckResult | null>(null);
  const [openingUpdate, setOpeningUpdate] = useState(false);
  const [supportingUpdate, setSupportingUpdate] = useState(false);
  const [viewerRoles, setViewerRoles] = useState<string[]>([]);
  const [viewerRolesLoaded, setViewerRolesLoaded] = useState(false);
  const updateCheckedRef = useRef(false);
  const firstSegment = segments[0] ?? '';
  const inAuth = firstSegment === 'login' || firstSegment === 'register';
  const isAdminViewer = viewerRoles.includes('admin') || viewerRoles.includes('webmaster');

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setViewerRoles([]);
      setViewerRolesLoaded(true);
      return;
    }

    setViewerRolesLoaded(false);
    void getUserProfileRaw()
      .then((raw) => {
        if (cancelled) {
          return;
        }
        try {
          const parsed = raw ? (JSON.parse(raw) as { roles?: string[] }) : null;
          setViewerRoles(Array.isArray(parsed?.roles) ? parsed.roles : []);
        } catch {
          setViewerRoles([]);
        } finally {
          setViewerRolesLoaded(true);
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setViewerRoles([]);
        setViewerRolesLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

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

    if (!token && !inAuth) {
      router.replace('/login');
      return;
    }

    if (token && inAuth) {
      router.replace('/(tabs)');
    }
  }, [isLoading, router, segments, token]);

  useEffect(() => {
    if (inAuth) {
      setPendingUpdate(null);
      updateCheckedRef.current = false;
      return;
    }

    if (!token) {
      updateCheckedRef.current = false;
    }
  }, [inAuth, token]);

  useEffect(() => {
    if (isLoading || inAuth || updateCheckedRef.current || !shouldCheckForAppUpdate()) {
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
  }, [inAuth, isLoading, token]);

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

  const handleSupportUpdateAction = async () => {
    if (!pendingUpdate?.mustUpdate || supportingUpdate || openingUpdate) {
      return;
    }

    setSupportingUpdate(true);
    try {
      if (token && viewerRolesLoaded && isAdminViewer) {
        const result = await revokeAdminAppUpdate(token);
        setPendingUpdate(null);
        Alert.alert('已撤销本次更新', result.message || '当前安装包升级提示已关闭。');
        return;
      }

      if (token) {
        await reportLogoutActivityIfNeeded(token);
      }
      await clearAuthStorage();
      await setAuthToken(null);
      setPendingUpdate(null);
      router.replace('/login');
    } catch (error) {
      console.error('Failed to handle support update action:', error);
      Alert.alert(
        token && viewerRolesLoaded && isAdminViewer ? '撤销失败' : '退出失败',
        token && viewerRolesLoaded && isAdminViewer
          ? '请稍后重试，或在管理员后台手动撤销本次更新。'
          : '请稍后重试，或联系管理员处理当前安装包更新。',
      );
    } finally {
      setSupportingUpdate(false);
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
        visible={Boolean(pendingUpdate) && !inAuth}
        update={pendingUpdate}
        opening={openingUpdate}
        supportActionLabel={
          pendingUpdate?.mustUpdate && viewerRolesLoaded
            ? isAdminViewer
              ? '撤销本次更新'
              : '退出登录'
            : null
        }
        supportActionLoading={supportingUpdate}
        onConfirm={() => void handleOpenUpdate()}
        onDismiss={handleDismissUpdate}
        onSupportAction={() => void handleSupportUpdateAction()}
      />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
