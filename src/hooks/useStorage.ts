import { useState, useEffect } from 'react';

export const useStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 从 localStorage 读取
    try {
      const cached = localStorage.getItem(key);
      if (cached !== null) {
        setValue(JSON.parse(cached));
      }
    } catch (e) {
      // localStorage 不可用
    }
    setLoading(false);
  }, [key]);

  const updateValue = (newValue: T) => {
    setValue(newValue);
    // 保存到 localStorage
    try {
      localStorage.setItem(key, JSON.stringify(newValue));
    } catch (e) {
      // localStorage 可能不可用（某些扩展页面）
    }
  };

  return [value, updateValue, loading] as const;
};
