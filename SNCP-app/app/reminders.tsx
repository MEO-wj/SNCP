import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AmbientBackground } from '@/components/ambient-background';
import { Palette } from '@/constants/palette';
import { useAuthToken } from '@/hooks/use-auth-token';
import { usePalette } from '@/hooks/use-palette';
import { createReminder, fetchReminders } from '@/services/reminders';
import type { Reminder } from '@/types/reminder';

export default function RemindersScreen() {
  const router = useRouter();
  const token = useAuthToken();
  const palette = usePalette();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [type, setType] = useState('meal');
  const [time, setTime] = useState('08:00');
  const [note, setNote] = useState('');

  const load = async () => {
    if (!token) {
      return;
    }
    try {
      const res = await fetchReminders(token);
      setReminders(res.reminders || []);
    } catch (error) {
      console.error('[Reminders] failed', error);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const handleAdd = async () => {
    if (!token) {
      return;
    }
    try {
      await createReminder(token, {
        reminder_type: type,
        time_of_day: time,
        note: note || undefined,
        repeat_days: [1, 2, 3, 4, 5, 6, 7],
        enabled: true,
      });
      setNote('');
      await load();
    } catch (error) {
      console.error('[Reminders] create failed', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <AmbientBackground variant="home" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>返回</Text>
        </Pressable>
        <Text style={styles.title}>提醒设置</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>新增提醒</Text>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>类型</Text>
            <TextInput value={type} onChangeText={setType} style={styles.formInput} />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>时间</Text>
            <TextInput value={time} onChangeText={setTime} style={styles.formInput} />
          </View>
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>备注</Text>
            <TextInput value={note} onChangeText={setNote} style={styles.formInput} />
          </View>
          <Pressable style={styles.primaryButton} onPress={handleAdd}>
            <Text style={styles.primaryButtonText}>保存提醒</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>已有提醒</Text>
          {reminders.length === 0 ? (
            <Text style={styles.emptyText}>暂无提醒，请先添加。</Text>
          ) : (
            reminders.map((item) => (
              <View key={item.id} style={styles.reminderItem}>
                <Text style={styles.reminderText}>{item.reminder_type}</Text>
                <Text style={styles.reminderTime}>{item.time_of_day}</Text>
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
      backgroundColor: palette.surface,
    },
    content: {
      padding: 20,
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
      gap: 12,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: palette.stone800,
    },
    formRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    formLabel: {
      width: 60,
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
    reminderItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: palette.stone100,
    },
    reminderText: {
      fontSize: 14,
      color: palette.stone700,
    },
    reminderTime: {
      fontSize: 14,
      fontWeight: '700',
      color: palette.stone900,
    },
  });
}
