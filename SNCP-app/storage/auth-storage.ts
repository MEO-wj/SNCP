// 认证存储工具：双端适配（App 用 SecureStore，Web 用 localStorage）

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_PROFILE_KEY = 'user_profile';

const isWebEnv = Platform.OS === 'web';

async function getItem(key: string) {
  try {
    if (!isWebEnv) {
      return await SecureStore.getItemAsync(key);
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (error) {
    console.error('Failed to read auth storage:', error);
  }
  return null;
}

async function setItem(key: string, value: string) {
  try {
    if (!isWebEnv) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.error('Failed to write auth storage:', error);
  }
}

async function removeItem(key: string) {
  try {
    if (!isWebEnv) {
      await SecureStore.deleteItemAsync(key);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to remove auth storage:', error);
  }
}

async function getProfileItem(key: string) {
  try {
    if (!isWebEnv) {
      return await AsyncStorage.getItem(key);
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch (error) {
    console.error('Failed to read user profile storage:', error);
  }
  return null;
}

async function setProfileItem(key: string, value: string) {
  try {
    if (!isWebEnv) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch (error) {
    console.error('Failed to write user profile storage:', error);
  }
}

async function removeProfileItem(key: string) {
  try {
    if (!isWebEnv && AsyncStorage) {
      await AsyncStorage.removeItem(key);
      return;
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.error('Failed to remove user profile storage:', error);
  }
}

export async function getAccessToken() {
  return await getItem(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token: string | null) {
  if (token) {
    await setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  await removeItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return await getItem(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string | null) {
  if (token) {
    await setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  await removeItem(REFRESH_TOKEN_KEY);
}

export async function getUserProfileRaw() {
  return await getProfileItem(USER_PROFILE_KEY);
}

export async function setUserProfileRaw(value: string | null) {
  if (value) {
    await setProfileItem(USER_PROFILE_KEY, value);
    return;
  }
  await removeProfileItem(USER_PROFILE_KEY);
}

export async function clearAuthStorage() {
  await Promise.all([
    removeItem(ACCESS_TOKEN_KEY),
    removeItem(REFRESH_TOKEN_KEY),
    removeProfileItem(USER_PROFILE_KEY),
  ]);
}
