import { Middleware } from '@reduxjs/toolkit';
import { RootState } from './store';
import dayjs from 'dayjs';

/**
 * Redux middleware: 当配置修改后异步同步到 chrome.storage
 * 使用防抖机制，避免频繁写入
 */
let syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DELAY = 300; // 防抖延迟时间（毫秒）

export const storageMiddleware: Middleware<{}, RootState> =
  (store) => (next) => (action) => {
    // 执行 action
    const result = next(action);

    // 检查是否是配置相关的 action
    if (action.type?.startsWith('config/')) {
      // 清除之前的定时器
      if (syncTimer) {
        clearTimeout(syncTimer);
      }

      // 设置新的定时器，延迟同步到 chrome.storage
      syncTimer = setTimeout(() => {
        const state = store.getState();
        const config = state.config;

        // 确保 updatedAt 是最新的
        const configToSave = {
          ...config,
          updatedAt: dayjs().toISOString(),
        };

        // 异步同步到 chrome.storage
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
          chrome.storage.local.set(
            {
              theme: configToSave.theme,
              updatedAt: configToSave.updatedAt,
              // 可以添加其他配置项
              // language: configToSave.language,
            },
            () => {
              if (chrome.runtime?.lastError) {
                console.error(
                  'Failed to sync config to chrome.storage:',
                  chrome.runtime.lastError
                );
              }
            }
          );

          // 同时同步到 localStorage（用于快速读取）
          try {
            localStorage.setItem('theme', JSON.stringify(configToSave.theme));
            localStorage.setItem(
              'updatedAt',
              JSON.stringify(configToSave.updatedAt)
            );
          } catch (e) {
            // localStorage 可能不可用
            console.warn('Failed to sync to localStorage:', e);
          }
        }
      }, SYNC_DELAY);
    }

    return result;
  };
