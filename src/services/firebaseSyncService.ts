/**
 * Firebase 同步服务 - 使用 Google OAuth2 和 Firebase Firestore
 * 提供配置的同步、历史记录管理、导入导出功能
 * 使用邮箱作为用户标识区分不同记录
 *
 * 使用指南：
 * 1. 在 Firebase Console 创建项目：https://console.firebase.google.com/
 * 2. 启用 Firestore Database
 * 3. 获取 Firebase 配置信息
 * 4. 调用 initializeFirebaseConfig() 初始化配置
 */

import {
  ConfigState,
  generateConfigId,
  loadConfig,
  setHistories,
  clearHistories,
} from '../store';
import { store } from '../store';
import dayjs from 'dayjs';

// ==================== Firebase 配置 ====================
// ⚠️ 请在此处填写你的 Firebase 配置信息
// 获取方式：Firebase Console -> Project Settings -> General -> Your apps -> SDK setup and configuration

// 你的 Firebase 配置
const FIREBASE_CONFIG: FirebaseConfig | null = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * 初始化 Firebase 配置（请在应用启动时调用）
 *
 * 使用方式 1: 直接在代码中配置（推荐用于开发环境）
 * ```typescript
 * await initializeFirebaseConfig({
 *   apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
 *   authDomain: "your-project.firebaseapp.com",
 *   projectId: "your-project-id",
 *   storageBucket: "your-project.appspot.com",
 *   messagingSenderId: "123456789012",
 *   appId: "1:123456789012:web:abcdef123456"
 * });
 * ```
 *
 * 使用方式 2: 从 Chrome storage 读取（推荐用于生产环境）
 * ```typescript
 * await saveFirebaseConfig({
 *   apiKey: "your-api-key",
 *   authDomain: "your-auth-domain",
 *   projectId: "your-project-id",
 *   storageBucket: "your-storage-bucket",
 *   messagingSenderId: "your-messaging-sender-id",
 *   appId: "your-app-id"
 * });
 * await initializeFirebaseConfig();
 * ```
 */
export async function initializeFirebaseConfig(
  config?: FirebaseConfig,
): Promise<void> {
  if (config) {
    await saveFirebaseConfig(config);
  }
}

// ==================== 数据结构定义 ====================

// 同步配置结构（存储在 Firestore）
export interface SyncConfigStorage {
  updatedAt: number; // 时间戳（毫秒）
  settings: ConfigState; // 配置对象
}

export interface SyncConfigParsed {
  updatedAt: number; // 时间戳（毫秒）
  settings: ConfigState;
}

// 同步历史记录结构（使用邮箱作为标识）
export interface SyncHistory {
  id: string;
  email: string; // 用户邮箱标识
  updatedAt: number;
  settings: ConfigState;
  type: 'upload' | 'download' | 'restore'; // 同步类型
}

// 历史记录列表
export interface SyncHistoryList {
  histories: SyncHistory[];
}

// Firestore 文档结构
export interface UserSyncData {
  email: string; // 用户邮箱（作为文档 ID）
  currentConfig: SyncConfigStorage | null; // 当前配置
  histories: SyncHistory[]; // 历史记录列表
  lastSyncAt: number; // 最后同步时间
}

// 导出常量
export const MAX_HISTORY_COUNT = 10; // 最多保存 10 条历史记录

// ==================== Firebase 初始化 ====================

let firebaseInitialized = false;
let db: any = null;
let auth: any = null;

/**
 * 初始化 Firebase
 *
 * 使用步骤：
 * 1. 首次使用时调用 initializeFirebaseConfig() 保存配置
 * 2. 调用此函数初始化 Firebase
 * 3. 后续使用会自动从 storage 加载配置
 *
 * @throws {Error} 如果 Firebase 配置不存在或初始化失败
 */
export async function initializeFirebase(): Promise<void> {
  if (firebaseInitialized) {
    console.log('[FirebaseSync] Firebase 已经初始化');
    return;
  }

  try {
    // 动态导入 Firebase SDK
    const firebaseMod = await import('firebase/app');
    const firestoreMod = await import('firebase/firestore');
    const firebaseAuthMod = await import('firebase/auth');

    // 从常量或 Chrome storage 获取 Firebase 配置
    let config: FirebaseConfig | null = FIREBASE_CONFIG;

    if (!config) {
      config = await getFirebaseConfigFromStorage();
    }

    if (!config) {
      console.error(
        '[FirebaseSync] Firebase 配置未找到，请先调用 initializeFirebaseConfig()',
      );
      throw new Error(
        'Firebase 配置未找到。请使用以下方式之一进行配置：\n' +
          '1. 在 firebaseSyncService.ts 中设置 FIREBASE_CONFIG 常量\n' +
          '2. 调用 initializeFirebaseConfig(config) 保存配置到 storage',
      );
    }

    // 验证配置是否完整
    const requiredFields: (keyof FirebaseConfig)[] = [
      'apiKey',
      'authDomain',
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId',
    ];
    const missingFields = requiredFields.filter((field) => !config![field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Firebase 配置不完整，缺少字段：${missingFields.join(', ')}\n` +
          '请在 Firebase Console 获取完整配置信息',
      );
    }

    // 初始化 Firebase
    if (!firebaseMod.getApps().length) {
      firebaseMod.initializeApp(config);
    }

    db = firestoreMod.getFirestore();
    auth = firebaseAuthMod.getAuth();

    firebaseInitialized = true;
    console.log('[FirebaseSync] Firebase 初始化成功', {
      projectId: config.projectId,
      authDomain: config.authDomain,
    });
  } catch (error: any) {
    console.error('[FirebaseSync] Firebase 初始化失败:', error);
    throw error;
  }
}

/**
 * 从 Chrome storage 获取 Firebase 配置
 */
async function getFirebaseConfigFromStorage(): Promise<FirebaseConfig | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['firebaseConfig'], (result) => {
      resolve(result.firebaseConfig || null);
    });
  });
}

/**
 * 保存 Firebase 配置到 Chrome storage
 */
export async function saveFirebaseConfig(
  config: FirebaseConfig,
): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ firebaseConfig: config }, () => {
      resolve();
    });
  });
}

/**
 * 清除 Firebase 配置
 */
export async function clearFirebaseConfig(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['firebaseConfig'], () => {
      resolve();
    });
  });
}

// ==================== Google OAuth2 认证 ====================

// 登录状态缓存
let loginStatusCache: {
  result: boolean | null;
  timestamp: number;
} = {
  result: null,
  timestamp: 0,
};
const LOGIN_STATUS_CACHE_DURATION = 5000; // 缓存 5 秒

// Token 有效期缓存
let tokenValidityCache: {
  token: string | null;
  expiresAt: number | null;
  checkedAt: number;
} = {
  token: null,
  expiresAt: null,
  checkedAt: 0,
};
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000; // 过期前 1 分钟视为无效

// 防止重复请求的标志
let isHandlingPermissionError = false;

/**
 * 清除登录状态缓存
 */
function clearLoginStatusCache(): void {
  loginStatusCache = {
    result: null,
    timestamp: 0,
  };
  tokenValidityCache = {
    token: null,
    expiresAt: null,
    checkedAt: 0,
  };
}

/**
 * 获取 OAuth2 token
 */
export async function getAccessToken(
  forceReauth: boolean = false,
): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      {
        interactive: true,
      },
      (token) => {
        if (chrome.runtime.lastError) {
          const errorMessage =
            chrome.runtime.lastError.message || '获取访问令牌失败';

          const isUserCancelled =
            errorMessage.includes('user did not approve') ||
            errorMessage.includes('user cancelled') ||
            errorMessage.includes('did not approve access');

          if (isUserCancelled) {
            clearLoginStatusCache();
            reject(new Error('用户取消了登录'));
          } else {
            reject(new Error(errorMessage));
          }
        } else if (!token) {
          reject(new Error('未获取到访问令牌'));
        } else {
          resolve(token);
        }
      },
    );
  });
}

/**
 * 检查是否已登录
 */
export async function isLoggedIn(): Promise<boolean> {
  const now = dayjs().valueOf();

  // 检查缓存
  if (
    loginStatusCache.result !== null &&
    now - loginStatusCache.timestamp < LOGIN_STATUS_CACHE_DURATION
  ) {
    return loginStatusCache.result;
  }

  return new Promise((resolve) => {
    chrome.identity.getAuthToken(
      {
        interactive: false,
      },
      async (token) => {
        if (chrome.runtime.lastError || !token) {
          loginStatusCache = { result: false, timestamp: now };
          resolve(false);
          return;
        }

        // 验证 token
        try {
          const response = await fetch(
            `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(token)}`,
          );

          if (!response.ok) {
            chrome.identity.removeCachedAuthToken({ token }, () => {
              clearLoginStatusCache();
              resolve(false);
            });
            return;
          }

          const tokenInfo = await response.json();

          if (tokenInfo.error || (!tokenInfo.user_id && !tokenInfo.email)) {
            chrome.identity.removeCachedAuthToken({ token }, () => {
              clearLoginStatusCache();
              resolve(false);
            });
            return;
          }

          // 更新缓存
          loginStatusCache = { result: true, timestamp: now };
          if (typeof tokenInfo.expires_in === 'number') {
            tokenValidityCache = {
              token,
              expiresAt: dayjs().valueOf() + tokenInfo.expires_in * 1000,
              checkedAt: dayjs().valueOf(),
            };
          } else {
            tokenValidityCache = {
              token,
              expiresAt: dayjs().valueOf() + 5 * 60 * 1000,
              checkedAt: dayjs().valueOf(),
            };
          }
          resolve(true);
        } catch (error) {
          resolve(false);
        }
      },
    );
  });
}

/**
 * 获取用户信息（邮箱、用户名、头像）
 */
export async function getUserInfo(): Promise<{
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
} | null> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const userInfo = await response.json();

    if (userInfo.error || !userInfo.email) {
      return null;
    }

    return {
      email: userInfo.email,
      name: userInfo.name || null,
      avatarUrl: userInfo.picture || null,
    };
  } catch (error) {
    console.error('[FirebaseSync] 获取用户信息失败:', error);
    return null;
  }
}

/**
 * 登出
 */
export async function logout(): Promise<void> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken(
      {
        interactive: false,
      },
      (token) => {
        if (token) {
          chrome.identity.removeCachedAuthToken({ token }, () => {
            clearLoginStatusCache();
            clearFirebaseConfig();
            resolve();
          });
        } else {
          clearLoginStatusCache();
          clearFirebaseConfig();
          resolve();
        }
      },
    );
  });
}

// ==================== Firestore 操作 ====================

/**
 * 获取用户邮箱标识
 */
async function getUserEmail(): Promise<string | null> {
  try {
    const userInfo = await getUserInfo();
    return userInfo?.email || null;
  } catch (error) {
    console.error('[FirebaseSync] 获取用户邮箱失败:', error);
    return null;
  }
}

/**
 * 获取或创建用户同步数据文档
 */
async function getUserSyncDoc(email: string): Promise<UserSyncData | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'userSync', email);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserSyncData;
    }

    // 文档不存在，创建新文档
    const newUserSync: UserSyncData = {
      email,
      currentConfig: null,
      histories: [],
      lastSyncAt: dayjs().valueOf(),
    };

    await setUserSyncDoc(email, newUserSync);
    return newUserSync;
  } catch (error) {
    console.error('[FirebaseSync] 获取用户同步文档失败:', error);
    return null;
  }
}

/**
 * 设置用户同步数据文档
 */
async function setUserSyncDoc(
  email: string,
  data: UserSyncData,
): Promise<void> {
  try {
    const { doc, setDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'userSync', email);
    await setDoc(docRef, {
      ...data,
      lastSyncAt: dayjs().valueOf(),
    });
  } catch (error) {
    console.error('[FirebaseSync] 设置用户同步文档失败:', error);
    throw error;
  }
}

/**
 * 更新用户同步文档的部分字段
 */
async function updateUserSyncDoc(
  email: string,
  updates: Partial<UserSyncData>,
): Promise<void> {
  try {
    const { doc, updateDoc } = await import('firebase/firestore');
    const docRef = doc(db, 'userSync', email);
    await updateDoc(docRef, {
      ...updates,
      lastSyncAt: dayjs().valueOf(),
    });
  } catch (error) {
    console.error('[FirebaseSync] 更新用户同步文档失败:', error);
    throw error;
  }
}

// ==================== 历史记录管理器 ====================

class HistoryBatchManager {
  private histories: SyncHistory[] = [];
  private email: string | null = null;
  private isActive: boolean = false;
  private lastEmail: string | null = null;

  /**
   * 开始批量操作：拉取最新历史记录到本地
   */
  async begin(email: string): Promise<void> {
    this.lastEmail = email;

    if (this.isActive) {
      console.warn('[HistoryBatchManager] 检测到未完成的批量操作，重置状态');
      this.reset();
    }

    this.email = email;
    this.isActive = true;

    try {
      const userSyncData = await getUserSyncDoc(email);
      this.histories = userSyncData?.histories || [];
    } catch (error: any) {
      console.error('[HistoryBatchManager] begin() 加载历史记录失败:', error);
      this.histories = [];
    }
  }

  /**
   * 添加历史记录（本地操作）
   */
  add(config: SyncConfigParsed, type: 'upload' | 'download' | 'restore'): void {
    if (!this.isActive) {
      if (this.lastEmail) {
        this.email = this.lastEmail;
        this.isActive = true;
        this.histories = [];
      } else {
        throw new Error('请先调用 begin() 开始批量操作');
      }
    }

    if (!this.email) {
      throw new Error('用户邮箱未设置');
    }

    const newHistory: SyncHistory = {
      id: `history-${dayjs().valueOf()}-${Math.random().toString(36).substring(2, 9)}`,
      email: this.email, // 添加邮箱标识
      updatedAt: config.updatedAt,
      settings: config.settings,
      type,
    };

    this.histories.unshift(newHistory);
    this.histories = this.histories.slice(0, MAX_HISTORY_COUNT);
  }

  /**
   * 删除历史记录（本地操作）
   */
  remove(historyId: string): boolean {
    if (!this.isActive) {
      if (this.lastEmail) {
        this.email = this.lastEmail;
        this.isActive = true;
        this.histories = [];
      } else {
        throw new Error('请先调用 begin() 开始批量操作');
      }
    }

    const originalLength = this.histories.length;
    this.histories = this.histories.filter((h) => h.id !== historyId);
    return this.histories.length < originalLength;
  }

  /**
   * 更新历史记录（本地操作）
   */
  update(historyId: string, updates: Partial<SyncHistory>): boolean {
    if (!this.isActive) {
      if (this.lastEmail) {
        this.email = this.lastEmail;
        this.isActive = true;
        this.histories = [];
      } else {
        throw new Error('请先调用 begin() 开始批量操作');
      }
    }

    const index = this.histories.findIndex((h) => h.id === historyId);
    if (index === -1) {
      return false;
    }

    this.histories[index] = { ...this.histories[index], ...updates };
    return true;
  }

  /**
   * 提交更改：上传到 Firestore
   */
  async commit(): Promise<void> {
    if (!this.isActive || !this.email) {
      throw new Error('批量操作未开始或邮箱无效');
    }

    // 重新加载最新数据并合并
    try {
      const userSyncData = await getUserSyncDoc(this.email);
      const cloudHistories = userSyncData?.histories || [];

      if (cloudHistories.length > 0 && this.histories.length > 0) {
        const historyMap = new Map<string, SyncHistory>();

        for (const cloudHistory of cloudHistories) {
          const configId = cloudHistory.settings.configId;
          if (configId) {
            historyMap.set(configId, cloudHistory);
          }
        }

        for (const localHistory of this.histories) {
          const configId = localHistory.settings.configId;
          if (configId) {
            const existingHistory = historyMap.get(configId);
            if (
              !existingHistory ||
              localHistory.updatedAt > existingHistory.updatedAt
            ) {
              historyMap.set(configId, localHistory);
            }
          }
        }

        this.histories = Array.from(historyMap.values());
        this.histories.sort((a, b) => b.updatedAt - a.updatedAt);
        this.histories = this.histories.slice(0, MAX_HISTORY_COUNT);
      }
    } catch (error) {
      console.error(
        '[HistoryBatchManager] commit() 加载云端历史记录失败:',
        error,
      );
    }

    // 保存到 Firestore
    await updateUserSyncDoc(this.email, {
      histories: this.histories,
    });

    // 同步更新 store
    store.dispatch(setHistories(this.histories));

    this.reset();
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.histories = [];
    this.email = null;
    this.isActive = false;
  }

  /**
   * 获取当前历史记录列表
   */
  getHistories(): SyncHistory[] {
    return [...this.histories];
  }

  /**
   * 设置历史记录列表
   */
  setHistories(histories: SyncHistory[]): void {
    if (!this.isActive) {
      throw new Error('请先调用 begin() 开始批量操作');
    }
    this.histories = histories.slice(0, MAX_HISTORY_COUNT);
  }
}

// 全局历史记录管理器实例
const historyBatchManager = new HistoryBatchManager();

// ==================== 核心同步功能 ====================

/**
 * 从本地存储获取配置
 */
function getLocalConfig(): SyncConfigParsed | null {
  try {
    const configState = store.getState().config;

    if (!configState) {
      return null;
    }

    let updatedAt: number;
    if (typeof configState.updatedAt === 'string') {
      const parsed = Date.parse(configState.updatedAt);
      updatedAt = !isNaN(parsed) && parsed > 0 ? parsed : dayjs().valueOf();
    } else if (typeof configState.updatedAt === 'number') {
      updatedAt =
        configState.updatedAt > 0 ? configState.updatedAt : dayjs().valueOf();
    } else {
      updatedAt = dayjs().valueOf();
    }

    return {
      updatedAt,
      settings: configState,
    };
  } catch (error) {
    console.error('[FirebaseSync] 从 Redux store 读取配置失败:', error);
    return null;
  }
}

/**
 * 上传配置到 Firebase
 */
export async function uploadConfig(): Promise<boolean> {
  try {
    if (!(await isLoggedIn())) {
      throw new Error('请先登录 Google 账户');
    }

    const email = await getUserEmail();
    if (!email) {
      throw new Error('无法获取用户邮箱');
    }

    console.log('[FirebaseSync] ===== 开始上传配置 =====');

    const localConfig = getLocalConfig();
    if (!localConfig) {
      return false;
    }

    const newConfigId = generateConfigId();
    const currentTimeString = dayjs().format('YYYY-MM-DD HH:mm:ss');
    const configToSync = {
      ...localConfig,
      settings: {
        ...localConfig.settings,
        configId: newConfigId,
        updatedAt: currentTimeString,
      },
    };

    store.dispatch(
      loadConfig({ configId: newConfigId, updatedAt: currentTimeString }),
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    const syncConfig: SyncConfigStorage = {
      updatedAt: dayjs().valueOf(),
      settings: configToSync.settings,
    };

    // 更新 Firestore
    await updateUserSyncDoc(email, {
      currentConfig: syncConfig,
    });

    // 保存到历史记录
    const updatedConfig = getLocalConfig();
    if (updatedConfig) {
      await historyBatchManager.begin(email);
      historyBatchManager.add(updatedConfig, 'upload');
      await historyBatchManager.commit();
    }

    return true;
  } catch (error: any) {
    console.error('[FirebaseSync] 上传配置失败:', error);
    throw error;
  }
}

/**
 * 从 Firebase 拉取配置
 */
export async function pullConfig(): Promise<boolean> {
  try {
    if (!(await isLoggedIn())) {
      throw new Error('请先登录 Google 账户');
    }

    const email = await getUserEmail();
    if (!email) {
      throw new Error('无法获取用户邮箱');
    }

    console.log('[FirebaseSync] ===== 开始拉取配置 =====');

    const userSyncData = await getUserSyncDoc(email);

    if (!userSyncData?.currentConfig?.settings) {
      return false;
    }

    store.dispatch(loadConfig(userSyncData.currentConfig.settings));

    // 保存到历史记录
    const syncConfigParsed: SyncConfigParsed = {
      updatedAt: userSyncData.currentConfig.updatedAt,
      settings: userSyncData.currentConfig.settings,
    };

    await historyBatchManager.begin(email);
    historyBatchManager.add(syncConfigParsed, 'download');
    await historyBatchManager.commit();

    return true;
  } catch (error: any) {
    console.error('[FirebaseSync] 拉取配置失败:', error);
    throw error;
  }
}

/**
 * 智能同步配置
 */
export async function syncConfig(): Promise<{
  action: 'upload' | 'download' | 'none';
  message: string;
}> {
  try {
    if (!(await isLoggedIn())) {
      throw new Error('请先登录 Google 账户');
    }

    const email = await getUserEmail();
    if (!email) {
      throw new Error('无法获取用户邮箱');
    }

    console.log('[FirebaseSync] ===== 开始智能同步配置 =====');

    const localConfig = getLocalConfig();
    if (!localConfig) {
      throw new Error('无法获取本地配置');
    }

    const userSyncData = await getUserSyncDoc(email);
    const cloudConfig = userSyncData?.currentConfig;

    if (!cloudConfig) {
      console.log('[FirebaseSync] 云端不存在配置，上传本地配置');
      await uploadConfig();
      return { action: 'upload', message: '已上传本地配置到云端' };
    }

    const localUpdatedAt = localConfig.updatedAt;
    const cloudUpdatedAt = cloudConfig.updatedAt;
    const timeDiff = localUpdatedAt - cloudUpdatedAt;

    // 比较配置内容
    const isContentSame =
      JSON.stringify(localConfig.settings) ===
      JSON.stringify(cloudConfig.settings);

    if (isContentSame && Math.abs(timeDiff) < 1000) {
      return { action: 'none', message: '配置已同步' };
    }

    if (timeDiff > 0) {
      await uploadConfig();
      return {
        action: 'upload',
        message: '已上传本地配置到云端（本地配置更新）',
      };
    } else {
      await pullConfig();
      return {
        action: 'download',
        message: '已下载云端配置到本地（云端配置更新）',
      };
    }
  } catch (error: any) {
    console.error('[FirebaseSync] 智能同步配置失败:', error);
    throw error;
  }
}

/**
 * 获取同步历史记录
 */
export async function getSyncHistory(): Promise<SyncHistory[]> {
  try {
    const state = store.getState();
    if (
      state.userInfo &&
      state.userInfo.histories &&
      state.userInfo.histories.length > 0
    ) {
      return state.userInfo.histories;
    }

    if (!(await isLoggedIn())) {
      return [];
    }

    const email = await getUserEmail();
    if (!email) {
      return [];
    }

    const userSyncData = await getUserSyncDoc(email);
    if (userSyncData?.histories) {
      store.dispatch(setHistories(userSyncData.histories));
      return userSyncData.histories;
    }

    return [];
  } catch (error) {
    console.error('[FirebaseSync] 获取同步历史记录失败:', error);
    return [];
  }
}

/**
 * 删除同步历史记录
 */
export async function deleteSyncHistory(historyId: string): Promise<boolean> {
  try {
    if (!(await isLoggedIn())) {
      return false;
    }

    const email = await getUserEmail();
    if (!email) {
      return false;
    }

    await historyBatchManager.begin(email);
    const removed = historyBatchManager.remove(historyId);

    if (!removed) {
      historyBatchManager.reset();
      return false;
    }

    await historyBatchManager.commit();
    return true;
  } catch (error) {
    console.error('[FirebaseSync] 删除历史记录失败:', error);
    return false;
  }
}

/**
 * 清空所有同步历史记录
 */
export async function clearAllSyncHistory(): Promise<boolean> {
  try {
    if (!(await isLoggedIn())) {
      return false;
    }

    const email = await getUserEmail();
    if (!email) {
      return false;
    }

    await updateUserSyncDoc(email, {
      histories: [],
      currentConfig: null,
    });

    store.dispatch(clearHistories());

    return true;
  } catch (error) {
    console.error('[FirebaseSync] 清空历史记录失败:', error);
    return false;
  }
}

/**
 * 恢复指定历史记录的配置
 */
export async function restoreFromHistory(historyId: string): Promise<boolean> {
  try {
    if (!(await isLoggedIn())) {
      return false;
    }

    const email = await getUserEmail();
    if (!email) {
      return false;
    }

    await historyBatchManager.begin(email);
    const histories = historyBatchManager.getHistories();

    const historyIndex = histories.findIndex((h) => h.id === historyId);
    if (historyIndex === -1) {
      historyBatchManager.reset();
      return false;
    }

    const history = histories[historyIndex];

    const restoredSettings: ConfigState = {
      ...history.settings,
    };

    store.dispatch(loadConfig(restoredSettings));

    const currentHistories = histories.filter((h) => h.id !== historyId);
    const allHistories = [history, ...currentHistories];

    historyBatchManager.setHistories(allHistories);
    await historyBatchManager.commit();

    return true;
  } catch (error) {
    console.error('[FirebaseSync] 从历史记录恢复失败:', error);
    return false;
  }
}

/**
 * 导出当前配置
 */
export async function exportCurrentConfig(): Promise<string> {
  try {
    const localConfig = getLocalConfig();
    if (!localConfig) {
      throw new Error('没有可导出的配置');
    }

    const exportData = {
      version: 1,
      exportDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      config: localConfig.settings,
      updatedAt: localConfig.updatedAt,
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('[FirebaseSync] 导出当前配置失败:', error);
    throw error;
  }
}

/**
 * 导入配置
 */
export async function importToCurrentConfig(
  jsonData: string,
): Promise<boolean> {
  try {
    const importData = JSON.parse(jsonData);

    let configToImport: ConfigState;
    if (importData.config) {
      configToImport = importData.config;
    } else if (importData.settings) {
      configToImport = importData.settings;
    } else {
      configToImport = importData;
    }

    if (!configToImport || typeof configToImport !== 'object') {
      throw new Error('无效的配置格式');
    }

    store.dispatch(loadConfig(configToImport));
    await new Promise((resolve) => setTimeout(resolve, 100));

    return true;
  } catch (error) {
    console.error('[FirebaseSync] 导入配置失败:', error);
    throw error;
  }
}

// ==================== 自动同步 ====================

let isAutoSyncing = false;

/**
 * 自动同步配置
 */
export async function autoSyncConfig(): Promise<boolean> {
  if (isAutoSyncing) {
    return false;
  }

  isAutoSyncing = true;

  try {
    if (!(await isLoggedIn())) {
      return false;
    }

    const email = await getUserEmail();
    if (!email) {
      return false;
    }

    console.log('[FirebaseSync] ===== 开始自动同步配置 =====');

    const localConfig = getLocalConfig();
    if (!localConfig) {
      return false;
    }

    await historyBatchManager.begin(email);
    const histories = historyBatchManager.getHistories();
    const firstHistory = histories.length > 0 ? histories[0] : null;

    if (!firstHistory) {
      await uploadConfig();
      historyBatchManager.reset();
      return true;
    }

    const localConfigId = localConfig.settings.configId;
    const cloudConfigId = firstHistory.settings.configId;

    if (localConfigId && cloudConfigId && localConfigId === cloudConfigId) {
      const differences = detectConfigDifferences(
        localConfig.settings,
        firstHistory.settings,
      );

      if (differences.length > 0) {
        const updatedConfig = getLocalConfig();
        if (updatedConfig) {
          historyBatchManager.update(firstHistory.id, {
            updatedAt: updatedConfig.updatedAt,
            settings: updatedConfig.settings,
            type: 'upload',
          });
          await historyBatchManager.commit();
        }
      }

      historyBatchManager.reset();
      return true;
    }

    historyBatchManager.reset();
    return true;
  } catch (error) {
    console.error('[FirebaseSync] 自动同步配置失败:', error);
    return false;
  } finally {
    isAutoSyncing = false;
  }
}

/**
 * 检测配置差异
 */
function detectConfigDifferences(
  config1: ConfigState,
  config2: ConfigState,
): string[] {
  const differences: string[] = [];
  const fieldsToCompare: (keyof ConfigState)[] = [
    'theme',
    'chooseEngine',
    'isDirectLink',
    'themeColor',
    'language',
  ];

  for (const field of fieldsToCompare) {
    const value1 = config1[field];
    const value2 = config2[field];

    if (JSON.stringify(value1) !== JSON.stringify(value2)) {
      differences.push(field);
    }
  }

  return differences;
}

// 导出历史记录管理器（用于向后兼容）
export { historyBatchManager };
