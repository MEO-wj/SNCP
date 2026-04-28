import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useAuthTokenState } from '@/hooks/use-auth-token';
import { reportExitActivityIfNeeded, reportLaunchActivityIfNeeded, resetRuntimeActivityTracking } from '@/services/activity';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { refreshSessionOnForeground } from '@/services/auth';

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
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
