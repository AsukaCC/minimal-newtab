/**
 * 同步服务 - 使用 Google OAuth2 和 Google Drive API
 * 提供配置的同步、历史记录管理、导入导出功能
 */

import { ConfigState, generateConfigId, loadConfig, setHistories, clearHistories } from '../store';
import { store } from '../store';
import dayjs from 'dayjs';

// 同步配置结构
export interface SyncConfigStorage {
  updatedAt: number; // 时间戳（毫秒）
  settings: ConfigState; // 配置对象
}

export interface SyncConfigParsed {
  updatedAt: number; // 时间戳（毫秒）
  settings: ConfigState;
}

// 同步历史记录结构
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

// Google Drive 文件 ID 存储键名（存储在本地 storage）
const DRIVE_CONFIG_FILE_ID_KEY = 'minimal-newtab-drive-config-file-id';
const DRIVE_HISTORY_FILE_ID_KEY = 'minimal-newtab-drive-history-file-id';

// Google Drive API 配置
const DRIVE_CONFIG_FILE_NAME = 'minimal-newtab-config.json';
const DRIVE_HISTORY_FILE_NAME = 'minimal-newtab-history.json';

const MAX_HISTORY_COUNT = 4; // 最多保存4条历史记录

// ==================== Google OAuth2 认证 ====================

// 登录状态缓存（避免短时间内重复验证）
let loginStatusCache: {
  result: boolean | null;
  timestamp: number;
} = {
  result: null,
  timestamp: 0,
};
const LOGIN_STATUS_CACHE_DURATION = 5000; // 缓存5秒

// 标记是否需要强制重新授权（遇到权限不足错误时设置）
let requiresForceReauth = false;

// 防止无限重试的标志
let isHandlingPermissionError = false;

// 防止重复下载同一文件的标志（用于防止无限循环）
const downloadCache: Map<string, { timestamp: number; promise: Promise<string> }> = new Map();
const DOWNLOAD_CACHE_DURATION = 2000; // 2秒内不重复下载同一文件

/**
 * 清除登录状态缓存（在登出或 token 被清除时调用）
 */
function clearLoginStatusCache(): void {
  loginStatusCache = {
    result: null,
    timestamp: 0,
  };
}

/**
 * 检查是否是权限不足错误
 */
function isInsufficientPermissionError(error: any, statusCode?: number): boolean {
  if (statusCode === 403 || statusCode === 401) {
    return true;
  }

  const errorMessage = error?.error?.message || error?.message || '';
  const errorReason = error?.error?.reason || '';
  const errorStatus = error?.status || '';

  // 检查各种权限不足的错误标识
  return (
    errorMessage.toLowerCase().includes('insufficient') ||
    errorMessage.toLowerCase().includes('permission denied') ||
    errorMessage.toLowerCase().includes('权限不足') ||
    errorReason === 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' ||
    errorReason === 'insufficientPermissions' ||
    errorStatus === 'PERMISSION_DENIED'
  );
}

/**
 * 处理权限不足错误：清除 token 缓存并抛出错误
 */
function handleInsufficientPermissionError(token: string, error: any, statusCode?: number): never {
  // 防止无限循环：如果已经在处理权限错误，直接抛出错误
  if (isHandlingPermissionError) {
    const authError: any = new Error('权限不足，请重新登录以获取完整权限');
    authError.requiresReauth = true;
    throw authError;
  }

  // 设置标志，防止无限重试
  isHandlingPermissionError = true;

  // 设置标志，下次获取 token 时强制重新授权
  requiresForceReauth = true;

  // 清除 token 缓存
  chrome.identity.removeCachedAuthToken({ token }, () => {
    clearLoginStatusCache(); // 清除登录状态缓存
    // 重置处理标志，允许下次重新授权
    setTimeout(() => {
      isHandlingPermissionError = false;
    }, 1000);
  });

  // 抛出特殊错误，标识需要强制重新授权
  const authError: any = new Error('权限不足，请重新登录以获取完整权限');
  authError.requiresReauth = true;
  throw authError;
}

/**
 * 获取 OAuth2 token
 * 重要：Chrome 扩展的 chrome.identity.getAuthToken 中的 scopes 参数**不会生效**
 * 实际 scopes 来自 manifest.json 中的 oauth2.scopes 配置
 *
 * 如果用户之前已经授权过，Chrome 会返回缓存的 token（可能不包含所有 scopes）
 * 因此，如果遇到权限不足错误，必须先清除旧 token，然后重新授权
 */
export async function getAccessToken(forceReauth: boolean = false): Promise<string> {
  // 如果之前遇到权限不足错误，或者明确要求强制重新授权，则清除旧 token
  const shouldForceReauth = forceReauth || requiresForceReauth;

  return new Promise((resolve, reject) => {
    // 如果需要强制重新授权，先尝试获取并清除旧 token
    if (shouldForceReauth) {
      requiresForceReauth = false; // 重置标志

      // 先尝试获取旧 token（如果存在）
      chrome.identity.getAuthToken(
        {
          interactive: false,
        },
        (oldToken) => {
          if (oldToken) {
            // 清除旧 token，强制重新授权
            // 注意：必须清除旧 token，否则 Chrome 会返回缓存的 token（可能不包含所有 scopes）
            chrome.identity.removeCachedAuthToken({ token: oldToken }, () => {
              clearLoginStatusCache();
              // 等待一下，确保 token 已清除
              setTimeout(() => {
                // 清除后重新获取（会使用 manifest.json 中的 scopes）
                requestNewToken(resolve, reject);
              }, 100);
            });
          } else {
            // 没有旧 token，直接获取新 token（会使用 manifest.json 中的 scopes）
            requestNewToken(resolve, reject);
          }
        }
      );
    } else {
      // 正常流程：直接获取 token（Chrome 会使用 manifest.json 中的 scopes）
      requestNewToken(resolve, reject);
    }
  });
}

/**
 * 请求新的 token（内部辅助函数）
 * 重要：Chrome 扩展中，chrome.identity.getAuthToken 的 scopes 参数**不会生效**
 * 实际 scopes 来自 manifest.json 中的 oauth2.scopes 配置
 *
 * 如果用户之前已经授权过，Chrome 会返回缓存的 token（可能不包含所有 scopes）
 * 因此，如果需要更新 scopes，必须先清除旧 token（通过 removeCachedAuthToken）
 */
function requestNewToken(resolve: (token: string) => void, reject: (error: Error) => void): void {
  // Chrome 扩展中，scopes 参数不会生效，实际 scopes 来自 manifest.json
  // 不传递 scopes 参数，让 Chrome 使用 manifest.json 中的配置
  console.log('[syncService] 请求新 token，将使用 manifest.json 中的 scopes 配置');

  chrome.identity.getAuthToken(
    {
      interactive: true,
      // 注意：Chrome 扩展中，scopes 参数不会生效
      // 实际 scopes 来自 manifest.json 中的 oauth2.scopes
      // 如果用户之前已授权，Chrome 会返回缓存的 token（可能不包含新 scopes）
      // 因此，如果需要更新 scopes，必须先清除旧 token（通过 removeCachedAuthToken）
    },
    (token) => {
      if (chrome.runtime.lastError) {
        const errorMessage = chrome.runtime.lastError.message || '获取访问令牌失败';
        console.error('[syncService] 获取 token 失败:', errorMessage);

        // 检查是否是用户取消登录的情况
        // Chrome 返回的错误消息包括：
        // - "The user did not approve access." - 用户明确点击取消或关闭授权窗口
        // - "The user is not signed in." - 用户未登录（当 interactive: false 时）
        // - "Authorization page could not be loaded." - 授权页面无法加载（用户快速关闭窗口）
        const isUserCancelled =
          errorMessage.includes('user did not approve') ||
          errorMessage.includes('user cancelled') ||
          errorMessage.includes('did not approve access') ||
          (errorMessage.includes('OAuth2') && errorMessage.includes('invalid_grant')) ||
          (errorMessage.includes('OAuth2') && errorMessage.includes('access_denied'));

        if (isUserCancelled) {
          // 用户取消登录，清除登录状态缓存，避免重复弹出
          clearLoginStatusCache();
          reject(new Error('用户取消了登录'));
        } else {
          reject(new Error(errorMessage));
        }
      } else if (!token) {
        console.error('[syncService] 未获取到 token');
        reject(new Error('未获取到访问令牌'));
      } else {
        console.log('[syncService] 成功获取 token（长度:', token.length, '）');
        resolve(token);
      }
    }
  );
}

/**
 * 检查是否已登录
 * 不仅检查能否获取 token，还验证 token 是否有效
 * 使用缓存机制避免短时间内重复验证
 */
export async function isLoggedIn(): Promise<boolean> {
  // 检查缓存是否有效
  const now = Date.now();
  if (
    loginStatusCache.result !== null &&
    now - loginStatusCache.timestamp < LOGIN_STATUS_CACHE_DURATION
  ) {
    // 返回缓存的结果（不打印日志，避免日志重复）
    return loginStatusCache.result;
  }

  return new Promise((resolve) => {
    try {
      // Chrome 扩展中，scopes 参数不会生效，实际 scopes 来自 manifest.json
      chrome.identity.getAuthToken(
        {
          interactive: false,
          // 注意：scopes 参数不会生效，实际 scopes 来自 manifest.json
        },
        async (token) => {
          // 检查是否有错误或没有 token
          if (chrome.runtime.lastError) {
            loginStatusCache = { result: false, timestamp: now };
            resolve(false);
            return;
          }

          if (!token) {
            loginStatusCache = { result: false, timestamp: now };
            resolve(false);
            return;
          }

          // 验证 token 是否有效：调用 Google OAuth2 tokeninfo API
          try {
            const response = await fetch(
              `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(token)}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!response.ok) {
              // Token 无效（可能已过期或被撤销），清除缓存的 token
              chrome.identity.removeCachedAuthToken({ token }, () => {
                clearLoginStatusCache(); // 清除登录状态缓存
                resolve(false);
              });
              return;
            }

            const tokenInfo = await response.json();

            // 检查 token 信息是否有效
            if (tokenInfo.error) {
              chrome.identity.removeCachedAuthToken({ token }, () => {
                clearLoginStatusCache(); // 清除登录状态缓存
                resolve(false);
              });
              return;
            }

            // 验证必要的字段是否存在
            if (!tokenInfo.user_id && !tokenInfo.email) {
              chrome.identity.removeCachedAuthToken({ token }, () => {
                clearLoginStatusCache(); // 清除登录状态缓存
                resolve(false);
              });
              return;
            }

            // Token 验证成功，更新缓存
            loginStatusCache = { result: true, timestamp: now };
            resolve(true);
          } catch (error: any) {
            console.error('[syncService] 验证 token 时出错:', error);
            // 网络错误或其他异常，保守地返回 false
            // 不清除 token，因为可能是临时网络问题
            // 也不更新缓存，让下次重试
            resolve(false);
          }
        }
      );
    } catch (error: any) {
      console.error('[syncService] 调用 getAuthToken 时出错:', error);
      resolve(false);
    }
  });
}

/**
 * 获取用户信息（邮箱）
 * 返回登录用户的邮箱，如果未登录或获取失败则返回 null
 */
export async function getUserInfo(): Promise<{ email: string } | null> {
  try {
    const token = await getAccessToken();
    if (!token) {
      return null;
    }

    // 调用 Google OAuth2 tokeninfo API 获取用户信息
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(token)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const tokenInfo = await response.json();

    // 检查 token 信息是否有效
    if (tokenInfo.error || !tokenInfo.email) {
      return null;
    }

    return {
      email: tokenInfo.email,
    };
  } catch (error: any) {
    console.error('[syncService] 获取用户信息失败:', error);
    return null;
  }
}

/**
 * 撤销 Google OAuth token
 */
async function revokeToken(token: string): Promise<void> {
  try {
    const revokeResponse = await fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    // 静默处理撤销结果，网络错误不影响登出流程
  } catch (error: any) {
    // 网络错误不影响登出流程
  }
}

/**
 * 登出（撤销 token、移除缓存并清除相关数据）
 */
export async function logout(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Chrome 扩展中，scopes 参数不会生效，实际 scopes 来自 manifest.json
      chrome.identity.getAuthToken(
        {
          interactive: false,
          // 注意：scopes 参数不会生效，实际 scopes 来自 manifest.json
        },
        (token) => {
          // 清除本地存储的函数
          const clearStorage = () => {
            chrome.storage.local.remove([DRIVE_CONFIG_FILE_ID_KEY, DRIVE_HISTORY_FILE_ID_KEY], () => {
              // 清除登录状态缓存
              clearLoginStatusCache();
              resolve();
            });
          };

          // 移除 Chrome token 缓存的函数
          const removeCachedToken = () => {
            if (token) {
              chrome.identity.removeCachedAuthToken({ token }, () => {
                if (chrome.runtime.lastError) {
                  const errorMsg = chrome.runtime.lastError.message || '移除 token 失败';
                  console.error('[syncService] 移除 Chrome token 缓存时出错:', errorMsg);
                }
                clearStorage();
              });
            } else {
              // 如果没有 token，直接清除本地存储
              clearStorage();
            }
          };

          if (token) {
            // 步骤1: 先撤销 Google token
            revokeToken(token)
              .then(() => {
                // 步骤2: 撤销完成后，移除 Chrome 缓存的 token
                removeCachedToken();
              })
              .catch((error: any) => {
                // 即使撤销失败，也继续移除缓存
                removeCachedToken();
              });
          } else {
            // 如果没有 token，直接清除本地存储
            clearStorage();
          }
        }
      );
    } catch (error: any) {
      console.error('[syncService] 登出时出错:', error);
      // 即使出错，也尝试清除本地存储和登录状态缓存
      clearLoginStatusCache();
      chrome.storage.local.remove([DRIVE_CONFIG_FILE_ID_KEY, DRIVE_HISTORY_FILE_ID_KEY], () => {
        reject(new Error(error.message || '登出失败'));
      });
    }
  });
}

// ==================== Google Drive API 操作 ====================

/**
 * 调用 Google Drive API
 */
async function callDriveAPI(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  const response = await fetch(`https://www.googleapis.com/drive/v3${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: '请求失败' } }));

    // 检查是否是权限不足错误
    if (isInsufficientPermissionError(error, response.status)) {
      handleInsufficientPermissionError(token, error, response.status);
    }

    const errorMessage = error.error?.message || `API 请求失败: ${response.status}`;
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * 上传文件到 Google Drive AppData 文件夹（使用已获取的 token）
 */
async function uploadFileToDriveWithToken(fileName: string, content: string, existingFileId: string | undefined, token: string): Promise<string> {
  // 如果存在文件 ID，则更新；否则创建新文件
  if (existingFileId) {
    // 更新现有文件 - 使用 resumable upload 或 simple upload
    // 对于 AppData 文件夹，我们使用 simple upload
    const formData = new FormData();
    const metadata = {
      name: fileName,
    };
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', new Blob([content], { type: 'application/json' }));

    const response = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: '更新文件失败' } }));

      // 检查是否是权限不足错误
      if (isInsufficientPermissionError(error, response.status)) {
        handleInsufficientPermissionError(token, error, response.status);
      }

      const errorMessage = error.error?.message || '更新文件失败';
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.id;
  } else {
    // 创建新文件到 AppData 文件夹
    const formData = new FormData();
    const metadata = {
      name: fileName,
      parents: ['appDataFolder'], // 指定 AppData 文件夹
    };
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', new Blob([content], { type: 'application/json' }));

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: '创建文件失败' } }));

      // 检查是否是权限不足错误
      if (isInsufficientPermissionError(error, response.status)) {
        handleInsufficientPermissionError(token, error, response.status);
      }

      const errorMessage = error.error?.message || '创建文件失败';
      throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.id;
  }
}

/**
 * 上传文件到 Google Drive AppData 文件夹
 */
async function uploadFileToDrive(fileName: string, content: string, existingFileId?: string): Promise<string> {
  const token = await getAccessToken();
  return uploadFileToDriveWithToken(fileName, content, existingFileId, token);
}

/**
 * 从 Google Drive 下载文件（使用已获取的 token）
 * 添加了防重复下载机制，避免无限循环
 */
async function downloadFileFromDriveWithToken(fileId: string, token: string): Promise<string> {
  // 检查缓存，防止短时间内重复下载同一文件
  const now = Date.now();
  const cached = downloadCache.get(fileId);
  if (cached && now - cached.timestamp < DOWNLOAD_CACHE_DURATION) {
    console.log(`[syncService] 使用缓存的下载请求，fileId: ${fileId}`);
    return cached.promise;
  }

  // 创建新的下载请求
  const downloadPromise = (async () => {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: '下载文件失败' } }));

    console.error('[syncService] 下载文件失败:', {
      fileId,
      status: response.status,
      error: error.error || error,
    });

    // 检查是否是权限不足错误
    if (isInsufficientPermissionError(error, response.status)) {
      console.error('[syncService] 检测到权限不足错误，fileId:', fileId, 'error:', error);
      // 清除缓存
      downloadCache.delete(fileId);
      // 权限不足错误会直接抛出，不会继续执行
      handleInsufficientPermissionError(token, error, response.status);
      // 这行代码不会被执行，但保留以保持代码清晰
      return '';
    }

    // 清除缓存，允许重试
    downloadCache.delete(fileId);
    const errorMessage = error.error?.message || '下载文件失败';
    throw new Error(errorMessage);
  }

    const content = await response.text();
    // 下载成功后，清除缓存（允许下次重新下载）
    downloadCache.delete(fileId);
    return content;
  })();

  // 缓存请求
  downloadCache.set(fileId, { timestamp: now, promise: downloadPromise });

  return downloadPromise;
}

/**
 * 从 Google Drive 下载文件
 */
async function downloadFileFromDrive(fileId: string): Promise<string> {
  const token = await getAccessToken();
  return downloadFileFromDriveWithToken(fileId, token);
}

/**
 * 查找 AppData 文件夹中的文件（使用已获取的 token）
 */
async function findFileInDriveWithToken(fileName: string, token: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(fileName)}' and 'appDataFolder' in parents&spaces=appDataFolder&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: '查找文件失败' } }));

      // 检查是否是权限不足错误
      if (isInsufficientPermissionError(error, response.status)) {
        handleInsufficientPermissionError(token, error, response.status);
      }

      throw new Error(error.error?.message || '查找文件失败');
    }

    const result = await response.json();
    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }
    return null;
  } catch (error: any) {
    // 如果是用户取消登录的错误，直接抛出
    if (error.message && error.message.includes('用户取消了登录')) {
      throw error;
    }
    // 如果是权限不足错误（requiresReauth 标志），直接抛出
    if (error.requiresReauth || error.message?.includes('权限不足')) {
      throw error;
    }
    console.error('[syncService] 查找文件失败:', error);
    return null;
  }
}

/**
 * 查找 AppData 文件夹中的文件
 */
async function findFileInDrive(fileName: string): Promise<string | null> {
  try {
    const result = await callDriveAPI(
      `/files?q=name='${encodeURIComponent(fileName)}' and 'appDataFolder' in parents&spaces=appDataFolder&fields=files(id,name)`
    );

    if (result.files && result.files.length > 0) {
      return result.files[0].id;
    }
    return null;
  } catch (error: any) {
    // 如果是用户取消登录的错误，直接抛出
    if (error.message && error.message.includes('用户取消了登录')) {
      throw error;
    }
    // 如果是权限不足错误（requiresReauth 标志），直接抛出
    if (error.requiresReauth || error.message?.includes('权限不足')) {
      throw error;
    }
    console.error('[syncService] 查找文件失败:', error);
    return null;
  }
}

/**
 * 获取或创建文件 ID（使用已获取的 token）
 */
async function getOrCreateFileIdWithToken(fileName: string, storageKey: string, token: string): Promise<string | null> {
  // 先从本地存储获取
  const localData = await new Promise<{ [key: string]: string }>((resolve) => {
    chrome.storage.local.get([storageKey], (result) => {
      resolve(result);
    });
  });

  if (localData[storageKey]) {
    // 验证文件是否还存在
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${localData[storageKey]}?fields=id`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        return localData[storageKey];
      }
      // 如果是权限不足错误，清除 token 缓存并抛出错误
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (isInsufficientPermissionError(error, response.status)) {
          handleInsufficientPermissionError(token, error, response.status);
        }
      }
    } catch (error: any) {
      // 如果是用户取消登录的错误，直接抛出
      if (error.message && error.message.includes('用户取消了登录')) {
        throw error;
      }
      // 如果是权限不足错误（requiresReauth 标志），直接抛出
      if (error.requiresReauth || error.message?.includes('权限不足')) {
        throw error;
      }
      // 验证失败时重新查找文件
    }
  }

  // 从 Drive 查找文件（使用已获取的 token）
  const fileId = await findFileInDriveWithToken(fileName, token);
  if (fileId) {
    // 保存到本地存储
    chrome.storage.local.set({ [storageKey]: fileId });
    return fileId;
  }

  return null;
}

/**
 * 获取或创建文件 ID
 */
async function getOrCreateFileId(fileName: string, storageKey: string): Promise<string | null> {
  // 先从本地存储获取
  const localData = await new Promise<{ [key: string]: string }>((resolve) => {
    chrome.storage.local.get([storageKey], (result) => {
      resolve(result);
    });
  });

  if (localData[storageKey]) {
    // 验证文件是否还存在
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${localData[storageKey]}?fields=id`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        return localData[storageKey];
      }
      // 如果是权限不足错误，清除 token 缓存并抛出错误
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        if (isInsufficientPermissionError(error, response.status)) {
          handleInsufficientPermissionError(token, error, response.status);
        }
      }
    } catch (error: any) {
      // 如果是用户取消登录的错误，直接抛出
      if (error.message && error.message.includes('用户取消了登录')) {
        throw error;
      }
      // 如果是权限不足错误（requiresReauth 标志），直接抛出
      if (error.requiresReauth || error.message?.includes('权限不足')) {
        throw error;
      }
      // 验证失败时重新查找文件
    }
  }

  // 从 Drive 查找文件
  const fileId = await findFileInDrive(fileName);
  if (fileId) {
    // 保存到本地存储
    chrome.storage.local.set({ [storageKey]: fileId });
    return fileId;
  }

  return null;
}

/**
 * 保存文件 ID 到本地存储
 */
async function saveFileId(fileId: string, storageKey: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [storageKey]: fileId }, () => {
      resolve();
    });
  });
}

// ==================== 辅助函数 ====================

/**
 * 从本地存储读取配置并转换为同步格式
 */
export function getLocalConfig(): SyncConfigParsed | null {
  try {
    // 从 Redux store 获取配置
    const configState = store.getState().config;

    if (!configState) {
      return null;
    }

    // 将 updatedAt 字符串转换为时间戳（毫秒）
    let updatedAt: number;
    if (typeof configState.updatedAt === 'string') {
      const parsed = Date.parse(configState.updatedAt);
      updatedAt = !isNaN(parsed) && parsed > 0 ? parsed : Date.now();
    } else if (typeof configState.updatedAt === 'number') {
      updatedAt = configState.updatedAt > 0 ? configState.updatedAt : Date.now();
    } else {
      updatedAt = Date.now();
    }

    const syncConfig: SyncConfigParsed = {
      updatedAt,
      settings: configState,
    };
    return syncConfig;
  } catch (error) {
    console.error('[syncService] 从 Redux store 读取配置失败:', error);
    return null;
  }
}

/**
 * 规范化更新时间戳
 */
function normalizeUpdatedAt(value: unknown): number {
  if (typeof value === 'number' && !isNaN(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return Date.now();
}

// ==================== 核心功能 ====================

/**
 * 1. 上传配置
 * 将当前本地配置上传到 Google Drive
 * 注意：如果用户未登录，getAccessToken() 会自动触发登录流程（弹出登录窗口）
 * 如果用户取消登录，会抛出错误，调用方需要处理
 */
export async function uploadConfig(): Promise<boolean> {
  try {
    // 先获取 token，确保用户已登录（如果未登录会弹出登录窗口）
    // 如果用户取消登录，会在这里抛出错误，不会继续执行
    const token = await getAccessToken();

    // 检查是否是用户取消登录的错误
    if (!token) {
      throw new Error('未获取到访问令牌');
    }

    // 获取 token 成功后才打印日志，表示真正开始上传配置
    console.log('[syncService] ===== 开始上传配置 =====');

    const localConfig = getLocalConfig();
    if (!localConfig) {
      return false;
    }

    // 每次同步时都创建新的配置ID
    const newConfigId = generateConfigId();
    const configToSync = {
      ...localConfig,
      settings: {
        ...localConfig.settings,
        configId: newConfigId,
      },
    };

    // 更新本地配置的 configId
    store.dispatch(loadConfig({ configId: newConfigId }));

    // 等待配置更新完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 准备同步配置
    const syncConfig: SyncConfigStorage = {
      updatedAt: Date.now(),
      settings: configToSync.settings,
    };

    // 获取或创建文件 ID（使用已获取的 token，避免重复验证）
    // 注意：这里传入 token，避免 getOrCreateFileId 内部再次调用 getAccessToken
    const existingFileId = await getOrCreateFileIdWithToken(DRIVE_CONFIG_FILE_NAME, DRIVE_CONFIG_FILE_ID_KEY, token);

    // 上传到 Google Drive（使用已获取的 token，避免重复验证）
    const fileId = await uploadFileToDriveWithToken(DRIVE_CONFIG_FILE_NAME, JSON.stringify(syncConfig), existingFileId || undefined, token);

    // 保存文件 ID
    await saveFileId(fileId, DRIVE_CONFIG_FILE_ID_KEY);

    // 上传成功后，保存到历史记录（使用批量操作，减少API调用）
    const updatedConfig = getLocalConfig();
    if (updatedConfig) {
      // 开始批量操作：拉取最新历史记录
      await historyBatchManager.begin(token);
      // 添加新记录
      historyBatchManager.add(updatedConfig, 'upload');
      // 提交更改：上传到云端（会自动同步更新 store）
      await historyBatchManager.commit();
    }

    return true;
  } catch (error: any) {
    // 如果是用户取消登录的错误，直接抛出，不要继续执行
    if (error.message && error.message.includes('用户取消了登录')) {
      throw error;
    }
    // 如果是权限不足错误（requiresReauth 标志），直接抛出
    if (error.requiresReauth || error.message?.includes('权限不足')) {
      throw error;
    }
    console.error('[syncService] 上传配置失败:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      errorObject: error,
    });
    throw error;
  }
}

/**
 * 2. 拉取配置
 * 从 Google Drive 拉取配置并应用到本地
 */
export async function pullConfig(): Promise<boolean> {
  console.log('[syncService] ===== 开始拉取配置 =====');
  try {
    // 检查登录状态
    if (!(await isLoggedIn())) {
      throw new Error('请先登录 Google 账户');
    }

    // 获取 token（使用已获取的 token，避免重复获取）
    const token = await getAccessToken();

    // 获取文件 ID（使用已获取的 token）
    const fileId = await getOrCreateFileIdWithToken(DRIVE_CONFIG_FILE_NAME, DRIVE_CONFIG_FILE_ID_KEY, token);

    if (!fileId) {
      return false;
    }

    // 下载文件（使用已获取的 token）
    const fileContent = await downloadFileFromDriveWithToken(fileId, token);
    const syncData: SyncConfigStorage = JSON.parse(fileContent);

    if (!syncData.settings) {
      console.error('[syncService] 无效的同步配置格式 - 缺少 settings:', syncData);
      return false;
    }

    const normalizedUpdatedAt = normalizeUpdatedAt(syncData.updatedAt);

    const syncConfigParsed: SyncConfigParsed = {
      updatedAt: normalizedUpdatedAt,
      settings: syncData.settings,
    };

    // 应用到本地配置
    store.dispatch(loadConfig(syncConfigParsed.settings));

    // 拉取成功后，保存到历史记录（使用批量操作，减少API调用）
    // 开始批量操作：拉取最新历史记录
    await historyBatchManager.begin(token);
    // 添加新记录
    historyBatchManager.add(syncConfigParsed, 'download');
    // 提交更改：上传到云端（会自动同步更新 store）
    await historyBatchManager.commit();

    return true;
  } catch (error: any) {
    // 如果是用户取消登录的错误，直接抛出
    if (error.message && error.message.includes('用户取消了登录')) {
      throw error;
    }
    // 如果是权限不足错误（requiresReauth 标志），直接抛出
    if (error.requiresReauth || error.message?.includes('权限不足')) {
      throw error;
    }
    console.error('[syncService] 拉取配置失败:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      errorObject: error,
    });
    throw error;
  }
}

/**
 * 比对两个配置对象的内容差异（忽略 updatedAt 和 configId）
 */
function compareConfigContent(config1: ConfigState, config2: ConfigState): boolean {
  // 创建副本并移除 updatedAt 和 configId 进行比较
  const { updatedAt: _, configId: __, ...config1WithoutMeta } = config1;
  const { updatedAt: ___, configId: ____, ...config2WithoutMeta } = config2;

  return JSON.stringify(config1WithoutMeta) === JSON.stringify(config2WithoutMeta);
}

/**
 * 检测两个配置对象的字段差异（忽略 updatedAt 和 configId）
 * 返回有差异的字段列表
 */
function detectConfigDifferences(config1: ConfigState, config2: ConfigState): string[] {
  const differences: string[] = [];

  // 需要比较的配置字段（排除 updatedAt 和 configId）
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

    // 使用 JSON.stringify 进行深度比较，处理对象和数组
    if (JSON.stringify(value1) !== JSON.stringify(value2)) {
      differences.push(field);
    }
  }

  return differences;
}

/**
 * 智能同步配置
 * 1. 检查云端是否存在配置
 * 2. 如果不存在，上传本地配置
 * 3. 如果存在，比对本地与云端配置的差异以及时间
 * 4. 根据比对结果决定同步策略：
 *    - 如果本地更新，上传本地配置
 *    - 如果云端更新，下载云端配置
 *    - 如果时间相同但内容不同，使用本地配置（用户当前正在使用）
 * 注意：如果用户未登录，getAccessToken() 会自动触发登录流程（弹出登录窗口）
 * 如果用户取消登录，会抛出错误，调用方需要处理
 */
export async function syncConfig(): Promise<{ action: 'upload' | 'download' | 'none'; message: string }> {
  try {
    // 先获取 token，确保用户已登录（如果未登录会弹出登录窗口）
    const token = await getAccessToken();

    // 检查是否是用户取消登录的错误
    if (!token) {
      throw new Error('未获取到访问令牌');
    }

    console.log('[syncService] ===== 开始智能同步配置 =====');

    // 获取本地配置
    const localConfig = getLocalConfig();
    if (!localConfig) {
      throw new Error('无法获取本地配置');
    }

    // 检查云端是否存在配置
    const cloudFileId = await findFileInDriveWithToken(DRIVE_CONFIG_FILE_NAME, token);

    // 如果云端不存在配置，直接上传本地配置
    if (!cloudFileId) {
      console.log('[syncService] 云端不存在配置，上传本地配置');

      // 创建新的配置ID
      const newConfigId = generateConfigId();
      const configToSync = {
        ...localConfig,
        settings: {
          ...localConfig.settings,
          configId: newConfigId,
        },
      };

      // 更新本地配置的 configId
      store.dispatch(loadConfig({ configId: newConfigId }));

      // 等待配置更新完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 准备同步配置
      const syncConfig: SyncConfigStorage = {
        updatedAt: Date.now(),
        settings: configToSync.settings,
      };

      // 上传到 Google Drive
      const fileId = await uploadFileToDriveWithToken(
        DRIVE_CONFIG_FILE_NAME,
        JSON.stringify(syncConfig),
        undefined,
        token
      );

      // 保存文件 ID
      await saveFileId(fileId, DRIVE_CONFIG_FILE_ID_KEY);

      // 上传成功后，保存到历史记录（使用批量操作，减少API调用）
      const updatedConfig = getLocalConfig();
      if (updatedConfig) {
        // 开始批量操作：拉取最新历史记录
        await historyBatchManager.begin(token);
        // 添加新记录
        historyBatchManager.add(updatedConfig, 'upload');
        // 提交更改：上传到云端
        await historyBatchManager.commit();
      }

      return { action: 'upload', message: '已上传本地配置到云端' };
    }

    // 云端存在配置，下载并比对
    console.log('[syncService] 云端存在配置，开始比对');

    // 下载云端配置（使用已获取的 token）
    const cloudFileContent = await downloadFileFromDriveWithToken(cloudFileId, token);
    const cloudSyncData: SyncConfigStorage = JSON.parse(cloudFileContent);

    if (!cloudSyncData.settings) {
      throw new Error('云端配置格式无效');
    }

    const normalizedCloudUpdatedAt = normalizeUpdatedAt(cloudSyncData.updatedAt);
    const cloudConfig: SyncConfigParsed = {
      updatedAt: normalizedCloudUpdatedAt,
      settings: cloudSyncData.settings,
    };

    // 比对时间戳
    const localUpdatedAt = localConfig.updatedAt;
    const cloudUpdatedAt = cloudConfig.updatedAt;
    const timeDiff = localUpdatedAt - cloudUpdatedAt;

    // 比对配置内容（忽略 updatedAt 和 configId）
    const isContentSame = compareConfigContent(localConfig.settings, cloudConfig.settings);

    console.log('[syncService] 配置比对结果:', {
      localUpdatedAt: new Date(localUpdatedAt).toISOString(),
      cloudUpdatedAt: new Date(cloudUpdatedAt).toISOString(),
      timeDiff,
      isContentSame,
    });

    // 如果内容相同，无需同步
    if (isContentSame && Math.abs(timeDiff) < 1000) {
      // 时间差小于1秒且内容相同，认为已同步
      console.log('[syncService] 配置已同步，无需操作');
      return { action: 'none', message: '配置已同步' };
    }

    // 根据时间戳决定同步策略
    if (timeDiff > 0) {
      // 本地更新，上传本地配置
      console.log('[syncService] 本地配置更新，上传到云端');

      const newConfigId = generateConfigId();
      const configToSync = {
        ...localConfig,
        settings: {
          ...localConfig.settings,
          configId: newConfigId,
        },
      };

      // 更新本地配置的 configId
      store.dispatch(loadConfig({ configId: newConfigId }));

      // 等待配置更新完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 准备同步配置
      const syncConfig: SyncConfigStorage = {
        updatedAt: Date.now(),
        settings: configToSync.settings,
      };

      // 上传到 Google Drive
      const fileId = await uploadFileToDriveWithToken(
        DRIVE_CONFIG_FILE_NAME,
        JSON.stringify(syncConfig),
        cloudFileId,
        token
      );

      // 保存文件 ID
      await saveFileId(fileId, DRIVE_CONFIG_FILE_ID_KEY);

      // 上传成功后，保存到历史记录（使用批量操作，减少API调用）
      const updatedConfig = getLocalConfig();
      if (updatedConfig) {
        // 开始批量操作：拉取最新历史记录
        await historyBatchManager.begin(token);
        // 添加新记录
        historyBatchManager.add(updatedConfig, 'upload');
        // 提交更改：上传到云端
        await historyBatchManager.commit();
      }

      return { action: 'upload', message: '已上传本地配置到云端（本地配置更新）' };
    } else if (timeDiff < 0) {
      // 云端更新，下载云端配置
      console.log('[syncService] 云端配置更新，下载到本地');

      // 应用到本地配置
      store.dispatch(loadConfig(cloudConfig.settings));

      // 下载成功后，保存到历史记录（使用批量操作，减少API调用）
      // 开始批量操作：拉取最新历史记录
      await historyBatchManager.begin(token);
      // 添加新记录
      historyBatchManager.add(cloudConfig, 'download');
      // 提交更改：上传到云端
      await historyBatchManager.commit();

      return { action: 'download', message: '已下载云端配置到本地（云端配置更新）' };
    } else {
      // 时间相同但内容不同，使用本地配置（用户当前正在使用）
      console.log('[syncService] 时间相同但内容不同，使用本地配置');

      const newConfigId = generateConfigId();
      const configToSync = {
        ...localConfig,
        settings: {
          ...localConfig.settings,
          configId: newConfigId,
        },
      };

      // 更新本地配置的 configId
      store.dispatch(loadConfig({ configId: newConfigId }));

      // 等待配置更新完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 准备同步配置
      const syncConfig: SyncConfigStorage = {
        updatedAt: Date.now(),
        settings: configToSync.settings,
      };

      // 上传到 Google Drive
      const fileId = await uploadFileToDriveWithToken(
        DRIVE_CONFIG_FILE_NAME,
        JSON.stringify(syncConfig),
        cloudFileId,
        token
      );

      // 保存文件 ID
      await saveFileId(fileId, DRIVE_CONFIG_FILE_ID_KEY);

      // 上传成功后，保存到历史记录（使用批量操作，减少API调用）
      const updatedConfig = getLocalConfig();
      if (updatedConfig) {
        // 开始批量操作：拉取最新历史记录
        await historyBatchManager.begin(token);
        // 添加新记录
        historyBatchManager.add(updatedConfig, 'upload');
        // 提交更改：上传到云端
        await historyBatchManager.commit();
      }

      return { action: 'upload', message: '已上传本地配置到云端（使用本地配置）' };
    }
  } catch (error: any) {
    // 如果是用户取消登录的错误，直接抛出，不要继续执行
    if (error.message && error.message.includes('用户取消了登录')) {
      throw error;
    }
    // 如果是权限不足错误（requiresReauth 标志），直接抛出
    if (error.requiresReauth || error.message?.includes('权限不足')) {
      throw error;
    }
    console.error('[syncService] 智能同步配置失败:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      errorObject: error,
    });
    throw error;
  }
}

// 自动同步状态锁（防止并发执行）
let isAutoSyncing = false;

/**
 * 自动同步配置（后台静默同步）
 * 先检查历史记录，历史记录的第一条就是当前配置
 * 如果本地配置的 configId 与历史记录第一条的 configId 匹配，则更新历史记录（不创建新配置）
 * 如果不匹配或历史记录为空，则创建新配置
 * 注意：如果用户未登录，静默返回 false，不抛出错误
 * 注意：使用状态锁防止并发执行
 */
export async function autoSyncConfig(): Promise<boolean> {
  // 检查状态锁，如果正在同步则直接返回
  if (isAutoSyncing) {
    console.log('[syncService] 自动同步正在进行中，跳过本次调用');
    return false;
  }

  // 设置状态锁
  isAutoSyncing = true;

  try {
    // 静默检查登录状态，如果未登录则直接返回
    if (!(await isLoggedIn())) {
      return false;
    }

    // 获取 token（如果失败，静默返回）
    let token: string;
    try {
      token = await getAccessToken();
      if (!token) {
        return false;
      }
    } catch (error) {
      // 静默处理错误，不抛出
      return false;
    }

    console.log('[syncService] ===== 开始自动同步配置 =====');

    // 获取本地配置
    const localConfig = getLocalConfig();
    if (!localConfig) {
      console.log('[syncService] 无法获取本地配置，跳过自动同步');
      return false;
    }

    // 先加载历史记录（历史记录的第一条就是当前配置）
    await historyBatchManager.begin(token);
    const histories = historyBatchManager.getHistories();
    const firstHistory = histories.length > 0 ? histories[0] : null;
    const firstHistoryConfigId = firstHistory?.settings?.configId;
    const localConfigId = localConfig.settings.configId;

    console.log('[syncService] 历史记录检查结果:', {
      historiesCount: histories.length,
      firstHistoryConfigId: firstHistoryConfigId || '(空)',
      localConfigId: localConfigId || '(空)',
      isMatch: firstHistoryConfigId === localConfigId,
    });

    // 如果历史记录为空，创建新配置
    if (!firstHistory) {
      console.log('[syncService] 历史记录为空，创建新配置');

      // 创建新的配置ID
      const newConfigId = generateConfigId();

      // 更新本地配置的 configId
      store.dispatch(loadConfig({ configId: newConfigId }));

      // 等待配置更新完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 获取更新后的配置
      const updatedConfig = getLocalConfig();
      if (updatedConfig) {
        // 添加新记录到历史记录（历史记录的第一条就是当前配置）
        historyBatchManager.add(updatedConfig, 'upload');
        // 提交更改：上传到云端
        await historyBatchManager.commit();
      }

      console.log('[syncService] 自动同步完成：已创建新配置');
      historyBatchManager.reset();
      return true;
    }

    // 历史记录存在，使用第一条历史记录作为当前配置进行比对
    const cloudConfig: SyncConfigParsed = {
      updatedAt: firstHistory.updatedAt,
      settings: firstHistory.settings,
    };
    const cloudConfigId = cloudConfig.settings.configId;

    // 比对 configId（使用历史记录第一条的 configId）
    console.log('[syncService] ConfigId 比对结果:', {
      localConfigId: localConfigId || '(空)',
      cloudConfigId: cloudConfigId || '(空)',
      isMatch: localConfigId === cloudConfigId,
    });

    // 如果历史记录第一条没有 configId，视为无效配置，重新创建
    if (!cloudConfigId) {
      console.log('[syncService] 历史记录第一条没有 configId，视为无效配置，重新创建');
      // 创建新的配置ID
      const newConfigId = generateConfigId();
      store.dispatch(loadConfig({ configId: newConfigId }));
      await new Promise((resolve) => setTimeout(resolve, 100));
      const updatedConfig = getLocalConfig();
      if (updatedConfig) {
        // 更新第一条历史记录
        historyBatchManager.update(firstHistory.id, {
          updatedAt: updatedConfig.updatedAt,
          settings: updatedConfig.settings,
          type: 'upload',
        });
        await historyBatchManager.commit();
      }
      console.log('[syncService] 自动同步完成：已更新历史记录（添加 configId）');
      historyBatchManager.reset();
      return true;
    }

    // 检测配置项的差异（忽略 updatedAt 和 configId）
    const differences = detectConfigDifferences(localConfig.settings, cloudConfig.settings);
    const isContentSame = differences.length === 0;

    // 如果 configId 匹配，说明本地配置就是历史记录中的最新配置
    if (localConfigId && cloudConfigId && localConfigId === cloudConfigId) {
      console.log('[syncService] ConfigId 匹配，本地配置是历史记录中的最新配置');

      // 使用 dayjs 计算历史记录第一条的更新时间与当前时间的差值
      const now = dayjs();
      const cloudUpdatedAt = dayjs(cloudConfig.updatedAt);
      const timeDiffDays = now.diff(cloudUpdatedAt, 'day', true);

      console.log('[syncService] 时间差检查:', {
        cloudUpdatedAt: cloudUpdatedAt.format('YYYY-MM-DD HH:mm:ss'),
        now: now.format('YYYY-MM-DD HH:mm:ss'),
        timeDiffDays: timeDiffDays.toFixed(2),
      });

      // 记录差异信息（如果有）
      if (differences.length > 0) {
        console.log('[syncService] 检测到配置项差异:', differences);
        console.log('[syncService] 差异详情:', differences.map(field => ({
          field,
          local: localConfig.settings[field as keyof ConfigState],
          cloud: cloudConfig.settings[field as keyof ConfigState],
        })));
      }

      // 判断是否需要更新历史记录（有差异或时间差大于1天）
      const shouldUpdateHistory = differences.length > 0 || timeDiffDays > 1;

      if (shouldUpdateHistory) {
        // 更新第一条历史记录
        const updatedConfig = getLocalConfig();
        if (updatedConfig) {
          historyBatchManager.update(firstHistory.id, {
            updatedAt: updatedConfig.updatedAt,
            settings: updatedConfig.settings,
            type: 'upload',
          });
          await historyBatchManager.commit();
        }

        const syncReason = differences.length > 0
          ? `差异字段: ${differences.join(', ')}`
          : `更新时间超过1天（${timeDiffDays.toFixed(2)}天）`;
        console.log('[syncService] 自动同步完成：已更新历史记录（', syncReason, '）');
      } else {
        console.log('[syncService] 配置内容相同且更新时间在1天内，无需同步');
      }

      historyBatchManager.reset();
      return true;
    } else if (isContentSame && cloudConfigId) {
      // ConfigId 不匹配或本地没有 configId，但配置内容相同且历史记录有 configId
      // 使用历史记录的 configId 更新本地配置
      console.log('[syncService] ConfigId 不匹配但配置内容相同，使用历史记录的 configId 更新本地配置');

      // 使用历史记录的 configId 更新本地配置
      store.dispatch(loadConfig({ configId: cloudConfigId }));

      // 等待配置更新完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 使用 dayjs 计算历史记录第一条的更新时间与当前时间的差值
      const now = dayjs();
      const cloudUpdatedAt = dayjs(cloudConfig.updatedAt);
      const timeDiffDays = now.diff(cloudUpdatedAt, 'day', true);

      // 如果没有差异且时间差小于等于1天，无需同步
      if (timeDiffDays <= 1) {
        console.log('[syncService] 配置内容相同且更新时间在1天内，无需同步');
        historyBatchManager.reset();
        return true;
      }

      // 时间差大于1天，需要更新历史记录
      console.log('[syncService] 配置内容相同，但更新时间超过1天（', timeDiffDays.toFixed(2), '天），需要更新');

      const updatedConfig = getLocalConfig();
      if (updatedConfig) {
        // 更新第一条历史记录
        historyBatchManager.update(firstHistory.id, {
          updatedAt: updatedConfig.updatedAt,
          settings: updatedConfig.settings,
          type: 'upload',
        });
        await historyBatchManager.commit();
      }

      console.log('[syncService] 自动同步完成：已使用历史记录的 configId 更新配置');
      historyBatchManager.reset();
      return true;
    } else {
      // ConfigId 不匹配或不存在，且配置内容不同，创建新配置
      console.log('[syncService] ConfigId 不匹配或不存在，且配置内容不同，创建新配置');

      const newConfigId = generateConfigId();

      // 更新本地配置的 configId
      store.dispatch(loadConfig({ configId: newConfigId }));

      // 等待配置更新完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 获取更新后的配置
      const updatedConfig = getLocalConfig();
      if (updatedConfig) {
        // 添加新记录到历史记录（历史记录的第一条就是当前配置）
        historyBatchManager.add(updatedConfig, 'upload');
        await historyBatchManager.commit();
      }

      console.log('[syncService] 自动同步完成：已创建新配置');
      historyBatchManager.reset();
      return true;
    }
  } catch (error: any) {
    // 静默处理错误，不抛出（自动同步不应该影响用户体验）
    console.error('[syncService] 自动同步配置失败（静默处理):', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    return false;
  } finally {
    // 释放状态锁
    isAutoSyncing = false;
  }
}

/**
 * 删除 Google Drive 中的文件（使用已获取的 token）
 */
async function deleteFileFromDriveWithToken(fileId: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json().catch(() => ({ error: { message: '删除文件失败' } }));

      // 检查是否是权限不足错误
      if (isInsufficientPermissionError(error, response.status)) {
        handleInsufficientPermissionError(token, error, response.status);
      }

      throw new Error(error.error?.message || '删除文件失败');
    }

    return true;
  } catch (error: any) {
    // 如果是用户取消登录的错误，直接抛出
    if (error.message && error.message.includes('用户取消了登录')) {
      throw error;
    }
    // 如果是权限不足错误（requiresReauth 标志），直接抛出
    if (error.requiresReauth || error.message?.includes('权限不足')) {
      throw error;
    }
    console.error('[syncService] 删除文件失败:', error);
    return false;
  }
}

/**
 * 3. 删除配置
 * 删除 Google Drive 中的配置文件
 */
export async function deleteConfig(): Promise<boolean> {
  console.log('[syncService] ===== 开始删除配置 =====');
  try {
    // 检查登录状态
    if (!(await isLoggedIn())) {
      throw new Error('请先登录 Google 账户');
    }

    const fileId = await getOrCreateFileId(DRIVE_CONFIG_FILE_NAME, DRIVE_CONFIG_FILE_ID_KEY);

    if (!fileId) {
      return true; // 文件不存在，视为删除成功
    }

    const token = await getAccessToken();
    await deleteFileFromDriveWithToken(fileId, token);

    // 清除本地存储的文件 ID
    chrome.storage.local.remove([DRIVE_CONFIG_FILE_ID_KEY]);

    return true;
  } catch (error: any) {
    console.error('[syncService] 删除配置失败:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    throw error;
  }
}

/**
 * 保存历史记录到 Google Drive（使用已获取的 token）
 */
async function saveHistoryToDriveWithToken(historyData: SyncHistoryList, token: string): Promise<void> {
  try {
    // 获取或创建文件 ID（使用已获取的 token）
    const existingFileId = await getOrCreateFileIdWithToken(DRIVE_HISTORY_FILE_NAME, DRIVE_HISTORY_FILE_ID_KEY, token);

    // 上传到 Google Drive（使用已获取的 token）
    const fileId = await uploadFileToDriveWithToken(
      DRIVE_HISTORY_FILE_NAME,
      JSON.stringify(historyData),
      existingFileId || undefined,
      token
    );

    // 保存文件 ID
    await saveFileId(fileId, DRIVE_HISTORY_FILE_ID_KEY);
  } catch (error) {
    console.error('[syncService] 保存历史记录到 Google Drive 失败:', error);
    throw error;
  }
}

/**
 * 保存历史记录到 Google Drive
 */
async function saveHistoryToDrive(historyData: SyncHistoryList): Promise<void> {
  try {
    // 检查登录状态
    if (!(await isLoggedIn())) {
      return;
    }

    const token = await getAccessToken();
    await saveHistoryToDriveWithToken(historyData, token);
  } catch (error) {
    console.error('[syncService] 保存历史记录到 Google Drive 失败:', error);
    throw error;
  }
}

/**
 * 从 Google Drive 加载历史记录（使用已获取的 token）
 * 注意：调用此函数前应确保用户已登录
 */
export async function loadHistoryFromDriveWithToken(token: string): Promise<SyncHistoryList | null> {
  try {
    // 获取文件 ID（使用已获取的 token）
    const fileId = await getOrCreateFileIdWithToken(DRIVE_HISTORY_FILE_NAME, DRIVE_HISTORY_FILE_ID_KEY, token);

    if (!fileId) {
      return null;
    }

    // 下载文件（使用已获取的 token）
    const fileContent = await downloadFileFromDriveWithToken(fileId, token);

    // 检查内容是否为空
    if (!fileContent || fileContent.trim() === '') {
      console.warn('[syncService] 历史记录文件为空');
      return null;
    }

    const historyData: SyncHistoryList = JSON.parse(fileContent);

    return historyData;
  } catch (error: any) {
    // 如果是权限不足错误，直接抛出，不要返回 null（避免无限重试）
    if (error.requiresReauth || error.message?.includes('权限不足')) {
      throw error;
    }
    console.error('[syncService] 从 Google Drive 加载历史记录失败:', error);
    return null;
  }
}

/**
 * 从 Google Drive 加载历史记录
 * 注意：调用此函数前应确保用户已登录
 */
async function loadHistoryFromDrive(): Promise<SyncHistoryList | null> {
  const token = await getAccessToken();
  return loadHistoryFromDriveWithToken(token);
}

/**
 * 历史记录管理器 - 支持批量操作
 * 使用方式：
 * 1. 调用 beginHistoryBatch() 开始批量操作（拉取最新历史记录）
 * 2. 调用 addHistoryItem() / removeHistoryItem() / updateHistoryItem() 进行本地操作
 * 3. 调用 commitHistoryBatch() 提交更改（上传到云端）
 */
class HistoryBatchManager {
  private histories: SyncHistory[] = [];
  private token: string | null = null;
  private isActive: boolean = false;

  /**
   * 开始批量操作：拉取最新历史记录到本地
   */
  async begin(token: string): Promise<void> {
    this.token = token;
    this.isActive = true;

    // 拉取最新历史记录
    const historyData = await loadHistoryFromDriveWithToken(token);
    this.histories = historyData?.histories || [];
  }

  /**
   * 添加历史记录（本地操作，不立即上传）
   */
  add(config: SyncConfigParsed, type: 'upload' | 'download' | 'restore'): void {
    if (!this.isActive) {
      throw new Error('请先调用 beginHistoryBatch() 开始批量操作');
    }

    const newHistory: SyncHistory = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      updatedAt: config.updatedAt,
      settings: config.settings,
      type,
    };

    // 添加到历史记录开头
    this.histories.unshift(newHistory);

    // 限制历史记录数量
    this.histories = this.histories.slice(0, MAX_HISTORY_COUNT);
  }

  /**
   * 删除历史记录（本地操作，不立即上传）
   */
  remove(historyId: string): boolean {
    if (!this.isActive) {
      throw new Error('请先调用 beginHistoryBatch() 开始批量操作');
    }

    const originalLength = this.histories.length;
    this.histories = this.histories.filter((h) => h.id !== historyId);
    return this.histories.length < originalLength;
  }

  /**
   * 更新历史记录（本地操作，不立即上传）
   */
  update(historyId: string, updates: Partial<SyncHistory>): boolean {
    if (!this.isActive) {
      throw new Error('请先调用 beginHistoryBatch() 开始批量操作');
    }

    const index = this.histories.findIndex((h) => h.id === historyId);
    if (index === -1) {
      return false;
    }

    this.histories[index] = { ...this.histories[index], ...updates };
    return true;
  }

  /**
   * 提交更改：上传到云端，并同步更新 store
   */
  async commit(): Promise<void> {
    if (!this.isActive || !this.token) {
      throw new Error('批量操作未开始或 token 无效');
    }

    await saveHistoryToDriveWithToken({ histories: this.histories }, this.token);

    // 同步更新 store 中的历史记录
    store.dispatch(setHistories(this.histories));

    // 重置状态
    this.reset();
  }

  /**
   * 取消批量操作
   */
  reset(): void {
    this.histories = [];
    this.token = null;
    this.isActive = false;
  }

  /**
   * 获取当前历史记录列表（本地）
   */
  getHistories(): SyncHistory[] {
    return [...this.histories];
  }

  /**
   * 设置历史记录列表（用于批量替换）
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

/**
 * 添加历史记录到 Google Drive（使用已获取的 token）
 * 优化：如果已有批量操作在进行，直接添加到批量操作中；否则创建新的批量操作
 */
async function addToHistoryWithToken(config: SyncConfigParsed, type: 'upload' | 'download' | 'restore', token: string): Promise<void> {
  try {
    // 如果批量操作未开始，先开始批量操作
    if (!historyBatchManager['isActive']) {
      await historyBatchManager.begin(token);
    }

    // 添加到批量操作中
    historyBatchManager.add(config, type);

    // 立即提交（保持向后兼容）
    await historyBatchManager.commit();
  } catch (error: any) {
    // 如果是权限不足错误，直接抛出，不要静默处理
    if (error.requiresReauth || error.message?.includes('权限不足')) {
      throw error;
    }
    console.error('[syncService] 保存到历史记录失败:', error);
    // 其他错误静默处理，不影响主流程
  }
}

/**
 * 添加历史记录到 Google Drive
 */
async function addToHistory(config: SyncConfigParsed, type: 'upload' | 'download' | 'restore'): Promise<void> {
  try {
    // 检查登录状态
    if (!(await isLoggedIn())) {
      return;
    }

    const token = await getAccessToken();
    await addToHistoryWithToken(config, type, token);
  } catch (error: any) {
    // 如果是权限不足错误，直接抛出，不要静默处理
    if (error.requiresReauth || error.message?.includes('权限不足')) {
      throw error;
    }
    console.error('[syncService] 保存到历史记录失败:', error);
    // 其他错误静默处理，不影响主流程
  }
}

/**
 * 4. 拉取历史
 * 从 Redux store 获取同步历史记录列表（优先从 store 读取，避免重复 API 调用）
 * 如果 store 中没有数据，则从 Google Drive 拉取
 */
export async function getSyncHistory(): Promise<SyncHistory[]> {
  try {
    // 优先从 store 读取历史记录
    const state = store.getState();
    if (state.userInfo && state.userInfo.histories && state.userInfo.histories.length > 0) {
      return state.userInfo.histories;
    }

    // 如果 store 中没有数据，从 Google Drive 拉取
    // 检查登录状态
    if (!(await isLoggedIn())) {
      return [];
    }

    const historyData = await loadHistoryFromDrive();
    if (historyData && historyData.histories) {
      // 同步到 store
      store.dispatch(setHistories(historyData.histories));
      return historyData.histories;
    }
    return [];
  } catch (error) {
    console.error('[syncService] 获取同步历史记录失败:', error);
    return [];
  }
}

/**
 * 删除指定的同步历史记录（使用批量操作，减少API调用）
 */
export async function deleteSyncHistory(historyId: string): Promise<boolean> {
  try {
    // 检查登录状态
    if (!(await isLoggedIn())) {
      return false;
    }

    const token = await getAccessToken();

    // 开始批量操作：拉取最新历史记录
    await historyBatchManager.begin(token);

    // 删除记录（本地操作）
    const removed = historyBatchManager.remove(historyId);
    if (!removed) {
      historyBatchManager.reset();
      return false;
    }

    // 提交更改：上传到云端（会自动同步更新 store）
    await historyBatchManager.commit();

    return true;
  } catch (error) {
    console.error('[syncService] 删除历史记录失败:', error);
    historyBatchManager.reset();
    return false;
  }
}

/**
 * 清空所有同步历史记录
 * 同时删除配置文件，确保完全清空同步数据
 */
export async function clearAllSyncHistory(): Promise<boolean> {
  try {
    // 检查登录状态
    if (!(await isLoggedIn())) {
      return false;
    }

    const token = await getAccessToken();

    // 1. 清空历史记录文件
    await saveHistoryToDriveWithToken({ histories: [] }, token);

    // 2. 删除配置文件（如果存在）
    try {
      const configFileId = await findFileInDriveWithToken(DRIVE_CONFIG_FILE_NAME, token);
      if (configFileId) {
        await deleteFileFromDriveWithToken(configFileId, token);
        console.log('[syncService] 已删除云端配置文件');
      }
    } catch (error) {
      // 删除配置文件失败不影响清空历史记录的操作
      console.log('[syncService] 删除配置文件失败（可能已不存在）:', error);
    }

    // 3. 清除本地存储的文件ID
    await chrome.storage.local.remove([DRIVE_CONFIG_FILE_ID_KEY, DRIVE_HISTORY_FILE_ID_KEY]);

    // 4. 同步更新 store
    store.dispatch(clearHistories());

    return true;
  } catch (error) {
    console.error('[syncService] 清空历史记录失败:', error);
    return false;
  }
}

/**
 * 恢复指定历史记录的配置（使用批量操作，减少API调用）
 * 恢复时会将对应的历史记录置顶，而不是创建新记录
 * 注意：只保存配置到本地并置顶历史记录，不更新时间，但会上传到云端
 */
export async function restoreFromHistory(historyId: string): Promise<boolean> {
  try {
    // 检查登录状态
    if (!(await isLoggedIn())) {
      return false;
    }

    const token = await getAccessToken();

    // 开始批量操作：拉取最新历史记录
    await historyBatchManager.begin(token);

    // 获取当前历史记录列表
    const histories = historyBatchManager.getHistories();

    // 查找要恢复的历史记录
    const historyIndex = histories.findIndex((h) => h.id === historyId);
    if (historyIndex === -1) {
      console.error('[syncService] 未找到历史记录:', historyId);
      historyBatchManager.reset();
      return false;
    }

    const history = histories[historyIndex];

    // 恢复配置到本地，不更新 updatedAt 时间（保持历史记录中的原始时间）
    const restoredSettings: ConfigState = {
      ...history.settings,
      // 不更新 updatedAt，保持历史记录中的原始时间
    };

    // 使用 Redux dispatch 更新配置（保存到本地）
    store.dispatch(loadConfig(restoredSettings));

    // 将历史记录置顶（不更新时间，保持原来的 updatedAt）
    const currentHistories = histories.filter((h) => h.id !== historyId);
    const allHistories = [history, ...currentHistories];

    // 设置历史记录列表（先添加要置顶的记录，再添加其他记录）
    historyBatchManager.setHistories(allHistories);

    // 提交更改：上传到云端（会自动同步更新 store）
    await historyBatchManager.commit();

    return true;
  } catch (error) {
    console.error('[syncService] 从历史记录恢复失败:', error);
    historyBatchManager.reset();
    return false;
  }
}

/**
 * 5. 导出当前配置
 * 导出当前本地配置为 JSON 字符串
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
    console.error('[syncService] 导出当前配置失败:', error);
    throw error;
  }
}

/**
 * 6. 导入到当前配置
 * 从 JSON 字符串导入配置并应用到当前配置
 */
export async function importToCurrentConfig(jsonData: string): Promise<boolean> {
  try {
    const importData = JSON.parse(jsonData);

    // 支持两种格式：直接是配置对象，或者包含 config 字段的对象
    let configToImport: ConfigState;
    if (importData.config) {
      configToImport = importData.config;
    } else if (importData.settings) {
      configToImport = importData.settings;
    } else {
      configToImport = importData;
    }

    // 验证配置格式
    if (!configToImport || typeof configToImport !== 'object') {
      throw new Error('无效的配置格式');
    }

    // 应用配置
    store.dispatch(loadConfig(configToImport));

    // 等待配置更新完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    return true;
  } catch (error) {
    console.error('[syncService] 导入配置失败:', error);
    throw error;
  }
}

// ==================== 辅助函数（向后兼容） ====================

/**
 * 根据 configId 查找匹配的历史记录
 */
export function findHistoryByConfigId(histories: SyncHistory[], configId: string | undefined): SyncHistory | undefined {
  if (!configId) {
    return undefined;
  }
  return histories.find((history) => history.settings.configId === configId);
}

// ==================== 向后兼容的别名 ====================

/**
 * @deprecated 使用 uploadConfig 代替
 */
export const uploadToDrive = uploadConfig;

/**
 * @deprecated 使用 pullConfig 代替
 */
export const pullFromDrive = pullConfig;

/**
 * 导出配置列表
 * 从历史记录中提取配置列表，按 configId 去重，每个配置只保留最新的
 */
export const exportSyncHistory = async (): Promise<string> => {
  // 优先从 store 读取历史记录
  const state = store.getState();
  const histories = state.userInfo?.histories || await getSyncHistory();

  // 从历史记录中提取配置，按 configId 去重，保留最新的配置
  const configMap = new Map<string, ConfigState>();

  for (const history of histories) {
    const configId = history.settings.configId;
    if (!configId) {
      continue;
    }

    // 如果该 configId 不存在，或者当前历史记录的更新时间更晚，则更新
    const existingConfig = configMap.get(configId);
    if (!existingConfig || history.updatedAt > (existingConfig.updatedAt ? dayjs(existingConfig.updatedAt).valueOf() : 0)) {
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
};

/**
 * 导入配置列表
 * 导入配置列表，找到最新的配置并应用到本地，同时将导入的配置添加到历史记录中
 */
export const importSyncHistory = async (jsonData: string): Promise<{ success: number; failed: number }> => {
  try {
    const importData = JSON.parse(jsonData);

    // 支持两种格式：新格式（configs）和旧格式（histories）以保持兼容性
    let configs: ConfigState[] = [];

    if (importData.configs && Array.isArray(importData.configs)) {
      // 新格式：配置列表
      configs = importData.configs;
    } else if (importData.histories && Array.isArray(importData.histories)) {
      // 旧格式：历史记录列表，提取配置
      configs = importData.histories.map((h: SyncHistory) => h.settings).filter((s: ConfigState) => s);
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

    // 检查登录状态（如果需要保存到云端）
    const loggedIn = await isLoggedIn();
    let token: string | null = null;

    if (loggedIn) {
      token = await getAccessToken();

      // 开始批量操作：拉取最新历史记录
      await historyBatchManager.begin(token);

      // 获取当前历史记录列表
      const currentHistories = historyBatchManager.getHistories();
      const currentConfigIds = new Set(
        currentHistories
          .map((h) => h.settings.configId)
          .filter((id): id is string => !!id)
      );

      // 将导入的配置添加到历史记录中（跳过已存在的 configId）
      for (const config of validConfigs) {
        if (config.configId && !currentConfigIds.has(config.configId)) {
          const configUpdatedAt = config.updatedAt ? dayjs(config.updatedAt).valueOf() : Date.now();
          const newHistory: SyncHistory = {
            id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
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

      // 提交更改：上传到云端（会自动同步更新 store）
      await historyBatchManager.commit();
    } else {
      // 未登录时，只更新本地 store 中的历史记录
      const state = store.getState();
      const currentHistories = state.userInfo?.histories || [];
      const currentConfigIds = new Set(
        currentHistories
          .map((h) => h.settings.configId)
          .filter((id): id is string => !!id)
      );

      const newHistories: SyncHistory[] = [];

      // 将导入的配置添加到历史记录中（跳过已存在的 configId）
      for (const config of validConfigs) {
        if (config.configId && !currentConfigIds.has(config.configId)) {
          const configUpdatedAt = config.updatedAt ? dayjs(config.updatedAt).valueOf() : Date.now();
          const newHistory: SyncHistory = {
            id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            updatedAt: configUpdatedAt,
            settings: config,
            type: 'restore',
          };
          newHistories.push(newHistory);
          currentConfigIds.add(config.configId);
        }
      }

      // 合并历史记录
      const mergedHistories = [...newHistories, ...currentHistories];

      // 按时间排序（最新的在前）
      mergedHistories.sort((a, b) => b.updatedAt - a.updatedAt);

      // 限制历史记录数量
      const limitedHistories = mergedHistories.slice(0, MAX_HISTORY_COUNT);

      // 同步更新 store
      store.dispatch(setHistories(limitedHistories));
    }

    // 应用最新的配置到本地
    store.dispatch(loadConfig(latestConfig));

    // 如果已登录，将最新配置上传到云端配置文件
    if (loggedIn && token) {
      try {
        // 准备同步配置（使用导入的配置，保持原有的 configId）
        const configUpdatedAt = latestConfig.updatedAt
          ? (typeof latestConfig.updatedAt === 'string'
              ? dayjs(latestConfig.updatedAt).valueOf()
              : latestConfig.updatedAt)
          : Date.now();

        const syncConfig: SyncConfigStorage = {
          updatedAt: configUpdatedAt,
          settings: latestConfig,
        };

        // 获取或创建文件 ID
        const existingFileId = await getOrCreateFileIdWithToken(DRIVE_CONFIG_FILE_NAME, DRIVE_CONFIG_FILE_ID_KEY, token);

        // 上传到 Google Drive
        const fileId = await uploadFileToDriveWithToken(
          DRIVE_CONFIG_FILE_NAME,
          JSON.stringify(syncConfig),
          existingFileId || undefined,
          token
        );

        // 保存文件 ID
        await saveFileId(fileId, DRIVE_CONFIG_FILE_ID_KEY);
      } catch (error) {
        // 上传云端配置失败不影响导入结果，只记录错误
        console.error('[syncService] 导入后更新云端配置失败:', error);
      }
    }

    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('[syncService] 导入配置失败:', error);
    throw error;
  }
};

// ==================== 全局自动同步管理器 ====================

// 自动同步定时器（20分钟）
let autoSyncTimer: ReturnType<typeof setInterval> | null = null;
const AUTO_SYNC_INTERVAL = 20 * 60 * 1000; // 20分钟

/**
 * 启动全局自动同步定时器
 * 如果已登录，每20分钟自动执行一次 autoSyncConfig
 */
export function startAutoSync(): void {
  // 清除现有定时器
  stopAutoSync();

  // 设置新的定时器
  autoSyncTimer = setInterval(async () => {
    try {
      console.log('[syncService] 执行后台自动同步...');
      await autoSyncConfig();
    } catch (err) {
      // 静默处理错误，不显示给用户
      console.error('[syncService] 后台自动同步失败:', err);
    }
  }, AUTO_SYNC_INTERVAL);

  console.log('[syncService] 已启动全局自动同步定时器（20分钟）');
}

/**
 * 停止全局自动同步定时器
 */
export function stopAutoSync(): void {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
    console.log('[syncService] 已停止全局自动同步定时器');
  }
}

/**
 * 重置全局自动同步定时器
 * 清除现有定时器并重新启动（用于手动同步后重置计时器）
 */
export function resetAutoSyncTimer(): void {
  stopAutoSync();
  startAutoSync();
}
