import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { BottomDock } from '@/components/bottom-dock';
import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { useUserProfile } from '@/hooks/use-user-profile';
import { setAuthToken } from '@/hooks/use-auth-token';
import { clearAuthStorage } from '@/storage/auth-storage';
import { getThemePreference, setThemePreference as saveThemePreference, type ThemePreference } from '@/storage/theme-storage';
import { fetchGoals, fetchProfile, updateGoals, updateProfile } from '@/services/profile';
import type { HealthProfile, NutritionGoals } from '@/types/profile';

export default function SettingsScreen() {
  const router = useRouter();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const token = useAuthToken();
  const userProfile = useUserProfile();
  const isAdmin = (userProfile?.roles || []).includes('admin');

  const [profile, setProfile] = useState<HealthProfile>({});
  const [goals, setGoals] = useState<NutritionGoals>({});
  const [saving, setSaving] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  useEffect(() => {
    if (!token) {
      return;
    }
    fetchProfile(token)
      .then((res) => setProfile(res.profile || {}))
      .catch(() => {});
    fetchGoals(token)
      .then((res) => setGoals(res.goals || {}))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    let mounted = true;
    void getThemePreference().then((nextPreference) => {
      if (mounted) {
        setThemePreference(nextPreference);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleThemeChange = (preference: ThemePreference) => {
    setThemePreference(preference);
    void saveThemePreference(preference);
  };

  const themeOptions: Array<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: '跟随系统' },
    { value: 'light', label: '日间' },
    { value: 'dark', label: '夜间' },
  ];

  const handleSave = async () => {
    if (!token) {
      return;
    }
    setSaving(true);
    try {
      const [profileRes, goalsRes] = await Promise.all([
        updateProfile(profile, token),
        updateGoals(goals, token),
      ]);
      setProfile(profileRes.profile || {});
      setGoals(goalsRes.goals || {});
    } catch (error) {
      console.error('[Profile] save failed', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await clearAuthStorage();
    await setAuthToken(null);
    router.replace('/login');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>我的</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>账号信息</Text>
          <Text style={styles.metaText}>手机号：{userProfile?.phone || '--'}</Text>
          <Text style={styles.metaText}>昵称：{userProfile?.display_name || '--'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>健康档案</Text>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>性别</Text>
            <TextInput
              style={styles.formInput}
              value={profile.gender || ''}
              onChangeText={(text) => setProfile((prev) => ({ ...prev, gender: text }))}
              placeholder="男/女"
              placeholderTextColor={palette.stone400}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>出生年份</Text>
            <TextInput
              style={styles.formInput}
              value={profile.birth_year ? String(profile.birth_year) : ''}
              onChangeText={(text) =>
                setProfile((prev) => ({ ...prev, birth_year: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder="例如 1965"
              placeholderTextColor={palette.stone400}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>身高(cm)</Text>
            <TextInput
              style={styles.formInput}
              value={profile.height_cm ? String(profile.height_cm) : ''}
              onChangeText={(text) =>
                setProfile((prev) => ({ ...prev, height_cm: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder="例如 165"
              placeholderTextColor={palette.stone400}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>体重(kg)</Text>
            <TextInput
              style={styles.formInput}
              value={profile.weight_kg ? String(profile.weight_kg) : ''}
              onChangeText={(text) =>
                setProfile((prev) => ({ ...prev, weight_kg: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder="例如 60"
              placeholderTextColor={palette.stone400}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>慢病标签</Text>
            <TextInput
              style={styles.formInput}
              value={(profile.chronic_conditions || []).join('、')}
              onChangeText={(text) =>
                setProfile((prev) => ({
                  ...prev,
                  chronic_conditions: text.split('、').map((item) => item.trim()).filter(Boolean),
                }))
              }
              placeholder="高血压、糖尿病"
              placeholderTextColor={palette.stone400}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>营养目标</Text>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>热量范围</Text>
            <TextInput
              style={styles.formInput}
              value={goals.calories_min ? String(goals.calories_min) : ''}
              onChangeText={(text) =>
                setGoals((prev) => ({ ...prev, calories_min: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder="最低"
              placeholderTextColor={palette.stone400}
            />
            <Text style={styles.formDash}>-</Text>
            <TextInput
              style={styles.formInput}
              value={goals.calories_max ? String(goals.calories_max) : ''}
              onChangeText={(text) =>
                setGoals((prev) => ({ ...prev, calories_max: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder="最高"
              placeholderTextColor={palette.stone400}
            />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>蛋白范围</Text>
            <TextInput
              style={styles.formInput}
              value={goals.protein_min ? String(goals.protein_min) : ''}
              onChangeText={(text) =>
                setGoals((prev) => ({ ...prev, protein_min: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder="最低"
              placeholderTextColor={palette.stone400}
            />
            <Text style={styles.formDash}>-</Text>
            <TextInput
              style={styles.formInput}
              value={goals.protein_max ? String(goals.protein_max) : ''}
              onChangeText={(text) =>
                setGoals((prev) => ({ ...prev, protein_max: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder="最高"
              placeholderTextColor={palette.stone400}
            />
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存档案'}</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>日夜间模式</Text>
          <View style={styles.themeRow}>
            {themeOptions.map((option) => {
              const isActive = themePreference === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.themeButton, isActive && styles.themeButtonActive]}
                  onPress={() => handleThemeChange(option.value)}
                >
                  <Text style={[styles.themeButtonText, isActive && styles.themeButtonTextActive]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>功能入口</Text>
          <Pressable style={styles.linkButton} onPress={() => router.push('/reminders')}>
            <Text style={styles.linkButtonText}>提醒设置</Text>
          </Pressable>
          {isAdmin && (
            <>
              <Pressable style={styles.linkButton} onPress={() => router.push('/admin/health-rules')}>
                <Text style={styles.linkButtonText}>管理健康禁忌</Text>
              </Pressable>
              <Pressable style={styles.linkButton} onPress={() => router.push('/admin/recipes')}>
                <Text style={styles.linkButtonText}>管理食谱库</Text>
              </Pressable>
            </>
          )}
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </Pressable>
      </ScrollView>
      <BottomDock
        activeTab="profile"
        onHome={() => router.replace('/(tabs)')}
        onRecord={() => router.replace('/(tabs)/record')}
        onRecommend={() => router.replace('/(tabs)/recommend')}
        onTrend={() => router.replace('/(tabs)/trend')}
        onProfile={() => router.replace('/(tabs)/settings')}
      />
    </SafeAreaView>
  );
}

function createStyles(palette: Palette) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      paddingTop: 24,
      paddingHorizontal: 20,
      paddingBottom: 140,
      gap: 16,
    },
    pageTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: palette.stone900,
      marginBottom: 4,
    },
    card: {
      backgroundColor: palette.white,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 10,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.stone800,
    },
    metaText: {
      fontSize: 14,
      color: palette.stone600,
    },
    formRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    formLabel: {
      width: 80,
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
    formDash: {
      fontSize: 16,
      color: palette.stone400,
    },
    primaryButton: {
      backgroundColor: palette.stone900,
      borderRadius: 18,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: palette.gold50,
      fontSize: 16,
      fontWeight: '700',
    },
    themeRow: {
      flexDirection: 'row',
      gap: 8,
      padding: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: palette.stone100,
      backgroundColor: palette.surfaceWarm,
    },
    themeButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    themeButtonActive: {
      backgroundColor: palette.stone900,
    },
    themeButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone600,
    },
    themeButtonTextActive: {
      color: palette.white,
    },
    linkButton: {
      backgroundColor: palette.surfaceWarm,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.stone100,
    },
    linkButtonText: {
      color: palette.stone700,
      fontSize: 14,
      fontWeight: '600',
    },
    logoutButton: {
      backgroundColor: palette.imperial50,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: palette.imperial100,
    },
    logoutText: {
      color: palette.imperial600,
      fontSize: 14,
      fontWeight: '700',
    },
  });
}
