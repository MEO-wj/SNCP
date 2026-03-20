import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_API_PORT = '4420';
const DEFAULT_API_PATH = '/api';
const LOCAL_API_BASE_URL = `http://127.0.0.1:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
const ANDROID_EMULATOR_API_BASE_URL = `http://10.0.2.2:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;

function extractHost(value?: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.includes('://') ? value : `http://${value}`;
  try {
    return new URL(normalized).hostname;
  } catch {
    return null;
  }
}

function buildApiBaseUrl(host: string) {
  return `http://${host}:${DEFAULT_API_PORT}${DEFAULT_API_PATH}`;
}

function getExpoDevHost() {
  return (
    extractHost(Constants.expoConfig?.hostUri) ||
    extractHost(Constants.platform?.hostUri) ||
    extractHost(Constants.linkingUri) ||
    extractHost(Constants.experienceUrl)
  );
}

function getConfiguredApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || '';
}

export function getApiBaseUrl() {
  const configuredBaseUrl = getConfiguredApiBaseUrl();
  const configuredHost = extractHost(configuredBaseUrl);

  if (configuredBaseUrl) {
    if (Platform.OS === 'android' && (configuredHost === 'localhost' || configuredHost === '127.0.0.1')) {
      return ANDROID_EMULATOR_API_BASE_URL;
    }
    return configuredBaseUrl;
  }

  if (!__DEV__) {
    return LOCAL_API_BASE_URL;
  }

  const expoDevHost = getExpoDevHost();

  if (Platform.OS === 'android') {
    return expoDevHost ? buildApiBaseUrl(expoDevHost) : ANDROID_EMULATOR_API_BASE_URL;
  }

  if (expoDevHost) {
    return buildApiBaseUrl(expoDevHost);
  }

  return LOCAL_API_BASE_URL;
}

export function buildAuthHeaders(token?: string | null) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
