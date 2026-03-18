export function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://172.29.14.46:4420/api';
}

export function buildAuthHeaders(token?: string | null) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
