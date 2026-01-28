import { useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { t, type Language } from '../i18n';

/**
 * 国际化 Hook
 * 返回翻译函数和当前语言
 */
export function useI18n() {
  const language = useAppSelector((state) => state.config.language) as Language;

  /**
   * 翻译函数
   * @param key 翻译键，支持点号分隔的嵌套路径，例如 'settings.title'
   * @param fallback 如果找不到翻译时的回退值
   * @returns 翻译后的文本
   */
  const translate = useCallback(
    (key: string, fallback?: string): string => {
      return t(language, key, fallback);
    },
    [language]
  );

  return {
    t: translate,
    language,
  };
}
