import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { colors, Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';

type HealthRule = {
  id: number;
  tag: string;
  forbidden_foods: string[];
  tips: string[];
};

export default function HealthRulesScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [rules, setRules] = useState<HealthRule[]>([]);
  const [tag, setTag] = useState('');
  const [foods, setFoods] = useState('');
  const [tips, setTips] = useState('');

  const load = async () => {
    if (!token) {
      return;
    }
    const resp = await fetch(`${getApiBaseUrl()}/admin/health_rules`, {
      headers: buildAuthHeaders(token),
    });
    if (resp.ok) {
      const data = await resp.json();
      setRules(data.rules || []);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const handleSave = async () => {
    if (!token) {
      return;
    }
    const resp = await fetch(`${getApiBaseUrl()}/admin/health_rules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
      body: JSON.stringify({
        tag: tag.trim(),
        forbidden_foods: foods.split('、').map((item) => item.trim()).filter(Boolean),
        tips: tips.split('、').map((item) => item.trim()).filter(Boolean),
      }),
    });
    if (resp.ok) {
      setTag('');
      setFoods('');
      setTips('');
      await load();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>健康禁忌管理</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>新增/更新规则</Text>
          <TextInput style={styles.input} value={tag} onChangeText={setTag} placeholder="标签，例如 高血压" />
          <TextInput
            style={styles.input}
            value={foods}
            onChangeText={setFoods}
            placeholder="禁忌食物，用“、”分隔"
          />
          <TextInput
            style={styles.input}
            value={tips}
            onChangeText={setTips}
            placeholder="建议提示，用“、”分隔"
          />
          <Pressable style={styles.primaryButton} onPress={handleSave}>
            <Text style={styles.primaryButtonText}>保存规则</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>现有规则</Text>
          {rules.length === 0 ? (
            <Text style={styles.emptyText}>暂无规则。</Text>
          ) : (
            rules.map((rule) => (
              <View key={rule.id} style={styles.ruleItem}>
                <Text style={styles.ruleTag}>{rule.tag}</Text>
                <Text style={styles.ruleText}>禁忌：{(rule.forbidden_foods || []).join('、') || '无'}</Text>
                <Text style={styles.ruleText}>提示：{(rule.tips || []).join('、') || '无'}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
      padding: 20,
      gap: 16,
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
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.stone800,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.stone200,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: 14,
      color: palette.stone800,
      backgroundColor: palette.surfaceWarm,
    },
    primaryButton: {
      backgroundColor: palette.stone900,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: palette.gold50,
      fontWeight: '700',
    },
    emptyText: {
      color: palette.stone500,
      fontSize: 14,
    },
    ruleItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.stone100,
      gap: 4,
    },
    ruleTag: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone800,
    },
    ruleText: {
      fontSize: 13,
      color: palette.stone600,
    },
  });
}
