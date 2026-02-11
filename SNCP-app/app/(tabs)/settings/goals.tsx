import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { fetchGoals, updateGoals } from '@/services/profile';
import type { NutritionGoals } from '@/types/profile';

export default function GoalsDetailScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

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
      router.back();
    } catch (error) {
      console.error('[Goals] save failed', error);
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
        <Text style={styles.title}>营养目标</Text>

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
          <Text style={styles.primaryButtonText}>{saving ? '保存中...' : '保存目标'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(palette: Palette) {
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
  });
}
