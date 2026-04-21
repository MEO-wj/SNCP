import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import {
  DEFAULT_NUTRITION_GOALS,
  getDefaultNutritionGoalsSummary,
  hasConfiguredNutritionGoals,
} from '@/constants/nutrition-goals';
import { Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';
import { primeNutritionExperience } from '@/services/nutrition-prime';
import { notifyNutritionRefresh } from '@/services/nutrition-refresh';
import { fetchGoals, updateGoals } from '@/services/profile';
import type { NutritionGoals } from '@/types/profile';

export default function GoalsDetailScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette, isDark), [isDark, palette]);

  const [goals, setGoals] = useState<NutritionGoals>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchGoals(token)
      .then((res) => setGoals(res.goals || {}))
      .catch(() => {});
  }, [token]);

  const handleSave = async () => {
    if (!token) {
      return;
    }

    setSaving(true);
    try {
      const res = await updateGoals(goals, token);
      setGoals(res.goals || {});
      notifyNutritionRefresh('goals');
      void primeNutritionExperience(token);
      router.back();
    } catch (error) {
      console.error('[Goals] save failed', error);
    } finally {
      setSaving(false);
    }
  };

  const showDefaultReminder = !hasConfiguredNutritionGoals(goals);

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>营养目标</Text>

        <View style={[styles.tipCard, showDefaultReminder && styles.tipCardActive]}>
          <Text style={styles.tipTitle}>普通成年人参考值</Text>
          <Text style={styles.tipText}>
            未填写时，可先参考每日 {getDefaultNutritionGoalsSummary()}。后续可以按体重、运动量和减脂或增肌目标再调整。
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>热量范围</Text>
            <TextInput
              style={styles.formInput}
              value={goals.calories_min ? String(goals.calories_min) : ''}
              onChangeText={(text) =>
                setGoals((prev) => ({ ...prev, calories_min: Number(text) || undefined }))
              }
              keyboardType="numeric"
              placeholder={String(DEFAULT_NUTRITION_GOALS.calories_min)}
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
              placeholder={String(DEFAULT_NUTRITION_GOALS.calories_max)}
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
              placeholder={String(DEFAULT_NUTRITION_GOALS.protein_min)}
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
              placeholder={String(DEFAULT_NUTRITION_GOALS.protein_max)}
              placeholderTextColor={palette.stone400}
            />
          </View>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存目标'}</Text>
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
    tipCard: {
      backgroundColor: palette.white,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: palette.stone100,
      gap: 6,
    },
    tipCardActive: {
      backgroundColor: palette.gold50,
      borderColor: palette.gold200,
    },
    tipTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: palette.stone800,
    },
    tipText: {
      fontSize: 13,
      lineHeight: 20,
      color: palette.stone600,
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
