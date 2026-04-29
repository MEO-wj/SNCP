import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';
import type { HealthProfile, NutritionGoals } from '@/types/profile';

export type AdminDashboardSummary = {
  total_users: number;
  active_users_30d: number;
  daily_active_users: number;
  ai_calls_total: number;
  ai_calls_today: number;
};

export type AdminDashboardTokenStats = {
  quota_total: number;
  used_total: number;
  used_today: number;
  call_total: number;
  call_today: number;
  primary_model: string;
  remaining_total: number;
};

export type AdminDashboardDailyAiCall = {
  key: string;
  label: string;
  total_calls: number;
  text_calls: number;
  image_calls: number;
};

export type AdminDashboardUser = {
  id: string;
  display_name: string;
  phone: string;
  roles: string[];
  avatar_url?: string | null;
  created_at: string | null;
  last_login_at: string | null;
  last_active_at: string | null;
  meal_count: number;
  ai_call_count: number;
  role_labels?: string[];
};

export type AdminDashboardUsersMeta = {
  limit: number;
  offset: number;
  returned: number;
  has_more: boolean;
  total_users?: number;
};

export type AdminDashboardResponse = {
  summary: AdminDashboardSummary;
  tokens: {
    text: AdminDashboardTokenStats;
    image: AdminDashboardTokenStats;
  };
  daily_ai_calls: AdminDashboardDailyAiCall[];
  users: AdminDashboardUser[];
  users_meta: AdminDashboardUsersMeta;
};

export type AdminDashboardUsersResponse = {
  users: AdminDashboardUser[];
  users_meta: AdminDashboardUsersMeta;
};

export type AdminDashboardUserDetailResponse = {
  user: AdminDashboardUser;
  profile: HealthProfile;
  goals: NutritionGoals;
  permissions: {
    viewer_can_manage_roles: boolean;
    can_promote_to_admin: boolean;
    can_revoke_admin: boolean;
  };
};

export type AdminAppUpdateConfig = {
  source: 'database' | 'env';
  latest_version: string | null;
  latest_build: number;
  min_supported_build: number;
  force_update: boolean;
  published_at: string | null;
  release_notes: string[];
  android_apk_url: string | null;
  android_apk_path: string | null;
  android_download_name: string | null;
  ios_url: string | null;
  updated_at: string | null;
};

export type AdminAppUpdateResolved = {
  update_enabled: boolean;
  download_url: string | null;
  download_mode: string | null;
  download_name: string | null;
  message: string | null;
};

export type AdminAppUpdateResponse = {
  config: AdminAppUpdateConfig;
  resolved: AdminAppUpdateResolved;
};

export type SaveAdminAppUpdatePayload = {
  latest_version: string | null;
  latest_build: number;
  min_supported_build: number;
  force_update: boolean;
  published_at: string | null;
  release_notes: string[];
  android_apk_url: string | null;
  android_apk_path: string | null;
  android_download_name: string | null;
  ios_url: string | null;
};

async function parseAdminDashboardResponse<T>(resp: Response, fallbackMessage: string) {
  if (resp.status === 403) {
    throw new Error('仅管理员或站长可访问后台数据管理');
  }

  if (!resp.ok) {
    const data = (await resp.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || fallbackMessage);
  }

  return (await resp.json()) as T;
}

export async function fetchAdminDashboard(token: string, days = 7, usersLimit = 10) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/admin/dashboard?days=${days}&users_limit=${usersLimit}`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }

  return parseAdminDashboardResponse<AdminDashboardResponse>(resp, '获取后台数据失败');
}

export async function fetchAdminDashboardUsers(token: string, limit = 10, offset = 0) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/admin/dashboard/users?limit=${limit}&offset=${offset}`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }

  return parseAdminDashboardResponse<AdminDashboardUsersResponse>(resp, '获取用户列表失败');
}

export async function fetchAdminUserDetail(token: string, userId: string) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/admin/users/${userId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }

  return parseAdminDashboardResponse<AdminDashboardUserDetailResponse>(resp, '获取用户详情失败');
}

export async function promoteAdminUser(token: string, userId: string) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/admin/users/${userId}/promote-admin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }

  return parseAdminDashboardResponse<{
    user: Pick<AdminDashboardUser, 'id' | 'roles' | 'role_labels'>;
    message: string;
  }>(resp, '设置管理员失败');
}

export async function revokeAdminUser(token: string, userId: string) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/admin/users/${userId}/revoke-admin`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }

  return parseAdminDashboardResponse<{
    user: Pick<AdminDashboardUser, 'id' | 'roles' | 'role_labels'>;
    message: string;
  }>(resp, '撤销管理员失败');
}

export async function fetchAdminAppUpdate(token: string) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/admin/app-update`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }

  return parseAdminDashboardResponse<AdminAppUpdateResponse>(resp, '获取应用更新配置失败');
}

export async function saveAdminAppUpdate(token: string, payload: SaveAdminAppUpdatePayload) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/admin/app-update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }

  return parseAdminDashboardResponse<AdminAppUpdateResponse>(resp, '保存应用更新配置失败');
}
