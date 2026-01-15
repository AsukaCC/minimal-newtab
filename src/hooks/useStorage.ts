import { useState, useEffect } from 'react';

export const useStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get([key], (result) => {
        if (result[key] !== undefined) {
          setValue(result[key]);
          // 同步到 localStorage 作为缓存，用于页面加载时快速读取
          try {
            localStorage.setItem(key, JSON.stringify(result[key]));
          } catch (e) {
            // localStorage 可能不可用（某些扩展页面）
          }
        }
        setLoading(false);
      });
    } else {
      // 如果没有 Chrome API，尝试从 localStorage 读取
      try {
        const cached = localStorage.getItem(key);
        if (cached !== null) {
          setValue(JSON.parse(cached));
        }
      } catch (e) {
        // localStorage 不可用
      }
      setLoading(false);
    }
  }, [key]);

  const updateValue = (newValue: T) => {
    setValue(newValue);
    // 同时保存到 chrome.storage 和 localStorage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [key]: newValue });
    }
    // 同步到 localStorage 作为缓存
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (e) {
      // localStorage 可能不可用（某些扩展页面）
    }
  };

  return [value, updateValue, loading] as const;
};
