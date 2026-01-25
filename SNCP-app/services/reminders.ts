import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { Reminder } from '@/types/reminder';

export async function fetchReminders(token: string) {
  const resp = await fetch(`${getApiBaseUrl()}/reminders`, {
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
  });
  if (!resp.ok) {
    throw new Error('获取提醒失败');
  }
  return (await resp.json()) as { reminders: Reminder[] };
}

export async function createReminder(token: string, payload: Partial<Reminder>) {
  const resp = await fetch(`${getApiBaseUrl()}/reminders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error('创建提醒失败');
  }
  return (await resp.json()) as { reminder: Reminder };
}

export async function updateReminder(token: string, reminderId: number, payload: Partial<Reminder>) {
  const resp = await fetch(`${getApiBaseUrl()}/reminders/${reminderId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error('更新提醒失败');
  }
  return (await resp.json()) as { reminder: Reminder };
}

export async function deleteReminder(token: string, reminderId: number) {
  const resp = await fetch(`${getApiBaseUrl()}/reminders/${reminderId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(token),
    },
  });
  if (!resp.ok) {
    throw new Error('删除提醒失败');
  }
  return (await resp.json()) as { deleted: boolean };
}
