import { store } from './store';
import { loadConfig } from './configSlice';
import type { ConfigState } from './configSlice';
import dayjs from 'dayjs';

/**
 * 初始化配置：从 chrome.storage 或 localStorage 加载配置
 * 应该在应用启动时调用
 */
export async function initConfig(): Promise<void> {
  return new Promise((resolve) => {
    // 优先从 localStorage 同步读取（最快）
    let config: Partial<ConfigState> = {};
    try {
      const cachedTheme = localStorage.getItem('theme');
      if (cachedTheme !== null) {
        config.theme = JSON.parse(cachedTheme) === true;
      }
      const cachedThemeColor = localStorage.getItem('themeColor');
      if (cachedThemeColor !== null) {
        config.themeColor = cachedThemeColor;
      }
      const cachedUpdatedAt = localStorage.getItem('updatedAt');
      if (cachedUpdatedAt !== null) {
        config.updatedAt = JSON.parse(cachedUpdatedAt);
      }
    } catch (e) {
      // localStorage 不可用
    }

    // 如果有缓存，先应用缓存配置
    if (config.theme !== undefined || config.updatedAt !== undefined || config.themeColor !== undefined) {
      store.dispatch(loadConfig(config));
      // 立即应用主题色
      if (config.themeColor) {
        document.documentElement.style.setProperty('--color-primary', config.themeColor);
      }
    }

    // 异步从 chrome.storage 读取并更新（确保数据一致性）
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['theme', 'themeColor', 'updatedAt'], (result) => {
        const loadedConfig: Partial<ConfigState> = {};

        if (result.theme !== undefined) {
          loadedConfig.theme = result.theme === true;
        }
        if (result.themeColor !== undefined) {
          loadedConfig.themeColor = result.themeColor;
        }
        if (result.updatedAt !== undefined) {
          // 验证日期格式
          const parsedDate = dayjs(result.updatedAt);
          loadedConfig.updatedAt = parsedDate.isValid()
            ? parsedDate.toISOString()
            : dayjs().toISOString();
        }

        // 更新 store
        if (Object.keys(loadedConfig).length > 0) {
          store.dispatch(loadConfig(loadedConfig));
          // 应用主题色
          if (loadedConfig.themeColor) {
            document.documentElement.style.setProperty('--color-primary', loadedConfig.themeColor);
          }
        }

        // 同步到 localStorage
        if (loadedConfig.theme !== undefined) {
          try {
            localStorage.setItem('theme', JSON.stringify(loadedConfig.theme));
          } catch (e) {
            // localStorage 不可用
          }
        }
        if (loadedConfig.themeColor !== undefined) {
          try {
            localStorage.setItem('themeColor', loadedConfig.themeColor);
          } catch (e) {
            // localStorage 不可用
          }
        }
        if (loadedConfig.updatedAt !== undefined) {
          try {
            localStorage.setItem(
              'updatedAt',
              JSON.stringify(loadedConfig.updatedAt)
            );
          } catch (e) {
            // localStorage 不可用
          }
        }

        resolve();
      });
    } else {
      resolve();
    }
  });
}
