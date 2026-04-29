import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { getApiBaseUrl } from '@/services/api';

export type AndroidUpdateCheckResult = {
  platform: 'android';
  updateEnabled: boolean;
  currentVersion: string | null;
  currentBuild: number | null;
  latestVersion: string | null;
  latestBuild: number;
  minSupportedBuild: number;
  forceUpdate: boolean;
  shouldUpdate: boolean;
  mustUpdate: boolean;
  publishedAt: string | null;
  releaseNotes: string[];
  downloadUrl: string | null;
  downloadMode: string | null;
  downloadName: string | null;
  message: string | null;
};

type NativeVersionInfo = {
  version: string | null;
  build: number | null;
};

function parseBuildNumber(rawValue: string | null | undefined) {
  if (!rawValue) {
    return null;
  }

  const normalized = rawValue.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeReleaseNotes(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function toAbsoluteDownloadUrl(downloadUrl: string | null) {
  if (!downloadUrl) {
    return null;
  }

  try {
    return new URL(downloadUrl, `${getApiBaseUrl()}/`).toString();
  } catch {
    return downloadUrl;
  }
}

export function shouldCheckForAppUpdate() {
  return Platform.OS === 'android' && !__DEV__;
}

export function getCurrentNativeVersionInfo(): NativeVersionInfo {
  const version =
    Application.nativeApplicationVersion?.trim() ||
    Constants.expoConfig?.version?.trim() ||
    null;

  const build =
    parseBuildNumber(Application.nativeBuildVersion) ||
    parseBuildNumber(String(Constants.expoConfig?.android?.versionCode ?? '')) ||
    null;

  return {
    version,
    build,
  };
}

export async function checkAndroidAppUpdate(): Promise<AndroidUpdateCheckResult | null> {
  if (!shouldCheckForAppUpdate()) {
    return null;
  }

  const current = getCurrentNativeVersionInfo();
  const query = new URLSearchParams();
  query.set('platform', 'android');
  if (current.version) {
    query.set('version', current.version);
  }
  if (current.build !== null) {
    query.set('build', String(current.build));
  }

  const response = await fetch(`${getApiBaseUrl()}/update/check?${query.toString()}`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(String(payload?.error || '版本检测失败'));
  }

  return {
    platform: 'android',
    updateEnabled: Boolean(payload?.update_enabled),
    currentVersion: typeof payload?.current_version === 'string' ? payload.current_version : current.version,
    currentBuild: typeof payload?.current_build === 'number' ? payload.current_build : current.build,
    latestVersion: typeof payload?.latest_version === 'string' ? payload.latest_version : null,
    latestBuild: Number(payload?.latest_build || 0),
    minSupportedBuild: Number(payload?.min_supported_build || 0),
    forceUpdate: Boolean(payload?.force_update),
    shouldUpdate: Boolean(payload?.should_update),
    mustUpdate: Boolean(payload?.must_update),
    publishedAt: typeof payload?.published_at === 'string' ? payload.published_at : null,
    releaseNotes: normalizeReleaseNotes(payload?.release_notes),
    downloadUrl: toAbsoluteDownloadUrl(
      typeof payload?.download_url === 'string' ? payload.download_url : null,
    ),
    downloadMode: typeof payload?.download_mode === 'string' ? payload.download_mode : null,
    downloadName: typeof payload?.download_name === 'string' ? payload.download_name : null,
    message: typeof payload?.message === 'string' ? payload.message : null,
  };
}

export async function openAndroidUpdateDownload(downloadUrl: string) {
  const absoluteUrl = toAbsoluteDownloadUrl(downloadUrl);
  if (!absoluteUrl) {
    throw new Error('更新链接不可用');
  }

  await Linking.openURL(absoluteUrl);
}
