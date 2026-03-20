import { buildAuthHeaders, getApiBaseUrl } from '@/services/api';

export type AccountProfile = {
  user_id: string;
  display_name: string;
  phone: string;
  roles: string[];
};

type UpdateAccountResponse = {
  user: {
    id: string;
    display_name: string;
    phone: string;
    roles: string[];
  };
};

export async function fetchMyAccount(token: string) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(token),
      },
    });
  } catch {
    throw new Error('无法连接后端服务，请检查服务器网络');
  }
  if (!resp.ok) {
    throw new Error('获取个人信息失败');
  }
  return (await resp.json()) as AccountProfile;
}

export async function updateMyAccount(payload: { display_name: string }, token: string) {
  let resp: Response;
  try {
    resp = await fetch(`${getApiBaseUrl()}/auth/me`, {
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
  if (resp.status === 405) {
    throw new Error('服务器当前未部署个人信息更新接口');
  }
  if (!resp.ok) {
    const data = (await resp.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || '更新个人信息失败');
  }
  return (await resp.json()) as UpdateAccountResponse;
}
