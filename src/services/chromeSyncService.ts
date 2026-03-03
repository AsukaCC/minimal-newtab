/**
 * Chrome 同步服务 - 使用 chrome.storage.sync 实现跨设备同步
 * 提供配置的同步、历史记录管理、导入导出功能
 * 使用 Chrome 账户自动同步，无需额外登录
 *
 * 使用指南：
 * 1. 确保在 manifest.json 中添加 "storage" 权限
 * 2. 数据会自动在用户的 Chrome 设备间同步（最多 100KB）
 * 3. 离线可用，网络恢复后自动同步
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

// ==================== 数据结构定义 ====================

// 同步配置结构（存储在 chrome.storage.sync）
export interface SyncConfigStorage {
  updatedAt: number; // 时间戳（毫秒）
  settings: ConfigState; // 配置对象
}

export interface SyncConfigParsed {
  updatedAt: number; // 时间戳（毫秒）
  settings: ConfigState;
}

// 同步历史记录结构（本地存储）
export interface SyncHistory {
  id: string;
  updatedAt: number;
  settings: ConfigState;
  type: 'upload' | 'download' | 'restore'; // 同步类型
}

// 历史记录列表
export interface SyncHistoryList {
  histories: SyncHistory[];
}

// Chrome Storage 数据结构
export interface ChromeSyncData {
  currentConfig: SyncConfigStorage | null; // 当前配置
  histories: SyncHistory[]; // 历史记录列表
  lastSyncAt: number; // 最后同步时间
}

// 导出常量
export const MAX_HISTORY_COUNT = 10; // 最多保存 10 条历史记录
const STORAGE_KEY = 'syncData';

// ==================== Chrome Storage 操作 ====================

/**
 * 从 Chrome Storage 获取数据
 */
async function getFromStorage<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      chrome.storage.sync.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.error('[ChromeSync] 读取存储失败:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result[key] || null);
        }
      });
    } catch (error) {
      console.error('[ChromeSync] 读取存储异常:', error);
      resolve(null);
    }
  });
}

/**
 * 保存数据到 Chrome Storage
 */
async function saveToStorage<T>(key: string, data: T): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.set({ [key]: data }, () => {
        if (chrome.runtime.lastError) {
          console.error('[ChromeSync] 保存存储失败:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (error) {
      console.error('[ChromeSync] 保存存储异常:', error);
      reject(error);
    }
  });
}

/**
 * 获取或创建用户同步数据
 */
async function getUserSyncData(): Promise<ChromeSyncData> {
  let syncData = await getFromStorage<ChromeSyncData>(STORAGE_KEY);

  if (!syncData) {
    // 初始化新的同步数据
    syncData = {
      currentConfig: null,
      histories: [],
      lastSyncAt: dayjs().valueOf(),
    };
    await saveToStorage(STORAGE_KEY, syncData);
  }

  return syncData;
}

/**
 * 保存用户同步数据
 */
async function saveUserSyncData(data: ChromeSyncData): Promise<void> {
  const dataWithTimestamp = {
    ...data,
    lastSyncAt: dayjs().valueOf(),
  };
  await saveToStorage(STORAGE_KEY, dataWithTimestamp);
}

// ==================== 历史记录管理器 ====================

class HistoryBatchManager {
  private histories: SyncHistory[] = [];
  private isActive: boolean = false;

  /**
   * 开始批量操作：拉取最新历史记录到本地
   */
  async begin(): Promise<void> {
    if (this.isActive) {
      console.warn('[HistoryBatchManager] 检测到未完成的批量操作，重置状态');
      this.reset();
    }

    this.isActive = true;

    try {
      const syncData = await getUserSyncData();
      this.histories = syncData?.histories || [];
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
      this.isActive = true;
      this.histories = [];
    }

    const newHistory: SyncHistory = {
      id: `history-${dayjs().valueOf()}-${Math.random().toString(36).substring(2, 9)}`,
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
      this.isActive = true;
      this.histories = [];
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
      this.isActive = true;
      this.histories = [];
    }

    const index = this.histories.findIndex((h) => h.id === historyId);
    if (index === -1) {
      return false;
    }

    this.histories[index] = { ...this.histories[index], ...updates };
    return true;
  }

  /**
   * 提交更改：保存到 Chrome Storage
   */
  async commit(): Promise<void> {
    if (!this.isActive) {
      throw new Error('批量操作未开始');
    }

    // 重新加载最新数据并合并
    try {
      const syncData = await getUserSyncData();
      const cloudHistories = syncData?.histories || [];

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

    // 保存到 Chrome Storage
    const syncData = await getUserSyncData();
    await saveUserSyncData({
      ...syncData,
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
export function getLocalConfig(): SyncConfigParsed | null {
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
    console.error('[ChromeSync] 从 Redux store 读取配置失败:', error);
    return null;
  }
}

/**
 * 上传配置到 Chrome Storage
 */
export async function uploadConfig(): Promise<boolean> {
  try {
    console.log('[ChromeSync] ===== 开始上传配置 =====');

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

    // 保存到 Chrome Storage
    const syncData = await getUserSyncData();
    await saveUserSyncData({
      ...syncData,
      currentConfig: syncConfig,
    });

    // 保存到历史记录
    const updatedConfig = getLocalConfig();
    if (updatedConfig) {
      await historyBatchManager.begin();
      historyBatchManager.add(updatedConfig, 'upload');
      await historyBatchManager.commit();
    }

    return true;
  } catch (error: any) {
    console.error('[ChromeSync] 上传配置失败:', error);
    throw error;
  }
}

/**
 * 从 Chrome Storage 拉取配置
 */
export async function pullConfig(): Promise<boolean> {
  try {
    console.log('[ChromeSync] ===== 开始拉取配置 =====');

    const syncData = await getUserSyncData();

    if (!syncData?.currentConfig?.settings) {
      return false;
    }

    store.dispatch(loadConfig(syncData.currentConfig.settings));

    // 保存到历史记录
    const syncConfigParsed: SyncConfigParsed = {
      updatedAt: syncData.currentConfig.updatedAt,
      settings: syncData.currentConfig.settings,
    };

    await historyBatchManager.begin();
    historyBatchManager.add(syncConfigParsed, 'download');
    await historyBatchManager.commit();

    return true;
  } catch (error: any) {
    console.error('[ChromeSync] 拉取配置失败:', error);
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
    console.log('[ChromeSync] ===== 开始智能同步配置 =====');

    const localConfig = getLocalConfig();
    if (!localConfig) {
      throw new Error('无法获取本地配置');
    }

    const syncData = await getUserSyncData();
    const cloudConfig = syncData?.currentConfig;

    if (!cloudConfig) {
      console.log('[ChromeSync] 云端不存在配置，上传本地配置');
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
    console.error('[ChromeSync] 智能同步配置失败:', error);
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

    const syncData = await getUserSyncData();
    if (syncData?.histories) {
      store.dispatch(setHistories(syncData.histories));
      return syncData.histories;
    }

    return [];
  } catch (error) {
    console.error('[ChromeSync] 获取同步历史记录失败:', error);
    return [];
  }
}

/**
 * 删除同步历史记录
 */
export async function deleteSyncHistory(historyId: string): Promise<boolean> {
  try {
    await historyBatchManager.begin();
    const removed = historyBatchManager.remove(historyId);

    if (!removed) {
      historyBatchManager.reset();
      return false;
    }

    await historyBatchManager.commit();
    return true;
  } catch (error) {
    console.error('[ChromeSync] 删除历史记录失败:', error);
    return false;
  }
}

/**
 * 清空所有同步历史记录
 */
export async function clearAllSyncHistory(): Promise<boolean> {
  try {
    const syncData = await getUserSyncData();
    await saveUserSyncData({
      ...syncData,
      histories: [],
      currentConfig: null,
    });

    store.dispatch(clearHistories());

    return true;
  } catch (error) {
    console.error('[ChromeSync] 清空历史记录失败:', error);
    return false;
  }
}

/**
 * 恢复指定历史记录的配置
 */
export async function restoreFromHistory(historyId: string): Promise<boolean> {
  try {
    await historyBatchManager.begin();
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
    console.error('[ChromeSync] 从历史记录恢复失败:', error);
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
    console.error('[ChromeSync] 导出当前配置失败:', error);
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
    console.error('[ChromeSync] 导入配置失败:', error);
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
    console.log('[ChromeSync] ===== 开始自动同步配置 =====');

    const localConfig = getLocalConfig();
    if (!localConfig) {
      return false;
    }

    await historyBatchManager.begin();
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
    console.error('[ChromeSync] 自动同步配置失败:', error);
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

// ==================== 自动同步管理器 ====================

// 自动同步定时器
let autoSyncTimer: ReturnType<typeof setInterval> | null = null;
const AUTO_SYNC_INTERVAL_MINUTES = 10;
const AUTO_SYNC_INTERVAL = AUTO_SYNC_INTERVAL_MINUTES * 60 * 1000; // 10 分钟

/**
 * 启动全局自动同步定时器
 */
export function startAutoSync(): void {
  // 清除现有定时器
  stopAutoSync();

  // 设置新的定时器
  autoSyncTimer = setInterval(async () => {
    try {
      console.log('[ChromeSync] 执行后台自动同步...');
      await autoSyncConfig();
    } catch (err) {
      // 静默处理错误，不显示给用户
      console.error('[ChromeSync] 后台自动同步失败:', err);
    }
  }, AUTO_SYNC_INTERVAL);

  console.log(
    `[ChromeSync] 已启动全局自动同步定时器（${AUTO_SYNC_INTERVAL_MINUTES}分钟）`,
  );
}

/**
 * 停止全局自动同步定时器
 */
export function stopAutoSync(): void {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
    console.log('[ChromeSync] 已停止全局自动同步定时器');
  }
}

/**
 * 重置全局自动同步定时器
 */
export function resetAutoSyncTimer(): void {
  stopAutoSync();
  startAutoSync();
}

// ==================== 手动同步 ====================

/**
 * 手动同步配置（用户点击同步按钮）
 */
export async function manualSyncConfig(): Promise<boolean> {
  try {
    const localConfig = getLocalConfig();
    if (!localConfig) {
      throw new Error('无法获取本地配置');
    }

    await historyBatchManager.begin();
    const histories = historyBatchManager.getHistories();
    const firstHistory = histories.length > 0 ? histories[0] : null;
    const localConfigId = localConfig.settings.configId;
    const firstConfigId = firstHistory?.settings?.configId;

    if (
      firstHistory &&
      localConfigId &&
      firstConfigId &&
      localConfigId === firstConfigId
    ) {
      const differences = detectConfigDifferences(
        localConfig.settings,
        firstHistory.settings,
      );
      if (differences.length === 0) {
        // 配置内容相同，仅更新时间
        const currentTimeString = dayjs().format('YYYY-MM-DD HH:mm:ss');
        store.dispatch(loadConfig({ updatedAt: currentTimeString }));

        await new Promise((resolve) => setTimeout(resolve, 100));
        const updatedConfig = getLocalConfig();
        if (updatedConfig) {
          historyBatchManager.update(firstHistory.id, {
            updatedAt: updatedConfig.updatedAt,
            settings: updatedConfig.settings,
            type: 'upload',
          });
          await historyBatchManager.commit();
        } else {
          historyBatchManager.reset();
        }

        return true;
      }
    }

    historyBatchManager.reset();
    return uploadConfig();
  } catch (error: any) {
    console.error('[ChromeSync] 手动同步配置失败:', error);
    throw error;
  }
}

// ==================== 用户信息辅助函数（向后兼容） ====================

/**
 * 检查是否已登录（Chrome 同步始终可用）
 * @deprecated Chrome 同步不需要登录，此函数始终返回 true
 */
export async function isLoggedIn(): Promise<boolean> {
  return true;
}

/**
 * 获取访问令牌（Chrome 同步不需要）
 * @deprecated Chrome 同步不需要 token，此函数返回空字符串
 */
export async function getAccessToken(): Promise<string> {
  return '';
}

/**
 * 获取用户信息（Chrome 同步不需要）
 * @deprecated Chrome 同步不需要用户信息，此函数返回 null
 */
export async function getUserInfo(): Promise<{
  email: string | null;
  name?: string | null;
  avatarUrl?: string | null;
} | null> {
  return null;
}

/**
 * 登出（Chrome 同步不需要）
 * @deprecated Chrome 同步不需要登出，此函数为空操作
 */
export async function logout(): Promise<void> {
  // Chrome 同步不需要登出操作
}

// ==================== 向后兼容的导出 ====================

/**
 * 根据 configId 查找匹配的历史记录
 */
export function findHistoryByConfigId(
  histories: SyncHistory[],
  configId: string | undefined,
): SyncHistory | undefined {
  if (!configId) {
    return undefined;
  }
  return histories.find((history) => history.settings.configId === configId);
}

/**
 * 导出配置列表
 * 从历史记录中提取配置列表，按 configId 去重，每个配置只保留最新的
 */
export async function exportSyncHistory(): Promise<string> {
  try {
    const state = store.getState();
    const histories = state.userInfo?.histories || [];

    // 从历史记录中提取配置，按 configId 去重，保留最新的配置
    const configMap = new Map<string, ConfigState>();

    for (const history of histories) {
      const configId = history.settings.configId;
      if (!configId) {
        continue;
      }

      // 如果该 configId 不存在，或者当前历史记录的更新时间更晚，则更新
      const existingConfig = configMap.get(configId);
      if (
        !existingConfig ||
        history.updatedAt >
          (existingConfig.updatedAt
            ? dayjs(existingConfig.updatedAt).valueOf()
            : 0)
      ) {
        configMap.set(configId, history.settings);
      }
    }

    // 转换为配置列表
    const configs = Array.from(configMap.values());

    // 按 updatedAt 排序（最新的在前）
    configs.sort((a, b) => {
      const timeA = a.updatedAt ? dayjs(a.updatedAt).valueOf() : 0;
      const timeB = b.updatedAt ? dayjs(b.updatedAt).valueOf() : 0;
      return timeB - timeA;
    });

    const exportData = {
      version: 1,
      exportDate: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      configs: configs,
    };
    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error('[ChromeSync] exportSyncHistory 失败:', error);
    throw error;
  }
}

/**
 * 导入配置列表
 * 导入配置列表，找到最新的配置并应用到本地，同时将导入的配置添加到历史记录中
 */
export async function importSyncHistory(
  jsonData: string,
): Promise<{ success: number; failed: number }> {
  try {
    const importData = JSON.parse(jsonData);

    // 支持两种格式：新格式（configs）和旧格式（histories）以保持兼容性
    let configs: ConfigState[] = [];

    if (importData.configs && Array.isArray(importData.configs)) {
      // 新格式：配置列表
      configs = importData.configs;
    } else if (importData.histories && Array.isArray(importData.histories)) {
      // 旧格式：历史记录列表，提取配置
      configs = importData.histories
        .map((h: SyncHistory) => h.settings)
        .filter((s: ConfigState) => s);
    } else {
      throw new Error('无效的导入格式：需要 configs 或 histories 字段');
    }

    if (configs.length === 0) {
      throw new Error('导入的配置列表为空');
    }

    // 验证配置格式
    let successCount = 0;
    let failedCount = 0;
    const validConfigs: ConfigState[] = [];

    for (const config of configs) {
      // 验证配置格式（至少需要 configId）
      if (config && typeof config === 'object') {
        validConfigs.push(config);
        successCount++;
      } else {
        failedCount++;
      }
    }

    if (validConfigs.length === 0) {
      throw new Error('没有有效的配置可以导入');
    }

    // 找到最新的配置（按 updatedAt 排序）
    validConfigs.sort((a, b) => {
      const timeA = a.updatedAt ? dayjs(a.updatedAt).valueOf() : 0;
      const timeB = b.updatedAt ? dayjs(b.updatedAt).valueOf() : 0;
      return timeB - timeA;
    });

    const latestConfig = validConfigs[0];

    // 开始批量操作：加载历史记录
    await historyBatchManager.begin();

    // 获取当前历史记录列表
    const currentHistories = historyBatchManager.getHistories();
    const currentConfigIds = new Set(
      currentHistories
        .map((h) => h.settings.configId)
        .filter((id): id is string => !!id),
    );

    // 将导入的配置添加到历史记录中（跳过已存在的 configId）
    for (const config of validConfigs) {
      if (config.configId && !currentConfigIds.has(config.configId)) {
        const configUpdatedAt = config.updatedAt
          ? dayjs(config.updatedAt).valueOf()
          : dayjs().valueOf();
        const newHistory: SyncHistory = {
          id: `history-${dayjs().valueOf()}-${Math.random().toString(36).substring(2, 9)}`,
          updatedAt: configUpdatedAt,
          settings: config,
          type: 'restore', // 导入的配置标记为 restore 类型
        };
        currentHistories.unshift(newHistory);
        currentConfigIds.add(config.configId);
      }
    }

    // 按时间排序（最新的在前）
    currentHistories.sort((a, b) => b.updatedAt - a.updatedAt);

    // 限制历史记录数量
    if (currentHistories.length > MAX_HISTORY_COUNT) {
      currentHistories.splice(MAX_HISTORY_COUNT);
    }

    // 设置历史记录列表
    historyBatchManager.setHistories(currentHistories);

    // 提交更改：更新 store
    await historyBatchManager.commit();

    // 应用最新的配置到本地
    store.dispatch(loadConfig(latestConfig));

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('[ChromeSync] importSyncHistory 失败:', error);
    throw error;
  }
}

/**
 * 从云端加载历史记录（用于向后兼容）
 * @deprecated 请直接使用 getSyncHistory
 */
export async function loadHistoryFromDriveWithToken(
  _token: string,
): Promise<SyncHistoryList | null> {
  // 此函数已废弃，直接使用 getSyncHistory
  try {
    const histories = await getSyncHistory();
    return { histories };
  } catch (error) {
    console.error('[ChromeSync] loadHistoryFromDriveWithToken 失败:', error);
    return null;
  }
}
