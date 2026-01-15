import { Storage } from 'redux-persist';

/**
 * Chrome Storage 适配器，用于 redux-persist
 * 将 redux-persist 的存储接口适配到 chrome.storage.local
 */
export const chromeStorage: Storage = {
  getItem: (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime?.lastError) {
            console.error('Chrome storage getItem error:', chrome.runtime.lastError);
            resolve(null);
          } else {
            const value = result[key] || null;
            if (value) {
              console.log(`[redux-persist] Loaded config from chrome.storage.local: ${key}`);
            } else {
              console.log(`[redux-persist] No config found in chrome.storage.local: ${key}`);
            }
            resolve(value);
          }
        });
      } else {
        // 降级到 localStorage
        try {
          const value = localStorage.getItem(key);
          if (value) {
            console.log(`[redux-persist] Loaded config from localStorage: ${key}`);
          }
          resolve(value);
        } catch (e) {
          resolve(null);
        }
      }
    });
  },

  setItem: (key: string, value: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime?.lastError) {
            console.error('Chrome storage setItem error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            // 调试：确认数据已保存
            console.log(`[redux-persist] Saved config to chrome.storage.local: ${key}`);
            resolve();
          }
        });
      } else {
        // 降级到 localStorage
        try {
          localStorage.setItem(key, value);
          console.log(`[redux-persist] Saved config to localStorage: ${key}`);
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    });
  },

  removeItem: (key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.remove([key], () => {
          if (chrome.runtime?.lastError) {
            console.error('Chrome storage removeItem error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      } else {
        // 降级到 localStorage
        try {
          localStorage.removeItem(key);
          resolve();
        } catch (e) {
          reject(e);
        }
      }
    });
  },
};
