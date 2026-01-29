import { useCallback, useEffect, useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { t, getUILanguage, normalizeLanguage, loadLocaleMessages, type I18nSubstitutions, type Language } from '../i18n';

/**
 * 国际化 Hook
 * 返回翻译函数和当前语言
 */
export function useI18n() {
  const storedLanguage = useAppSelector((state) => state.config.language) as Language | undefined;
  const uiLanguage = normalizeLanguage(getUILanguage());
  const language = storedLanguage ? normalizeLanguage(storedLanguage) : uiLanguage;
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  useEffect(() => {
    let isActive = true;
    loadLocaleMessages(language).then(() => {
      if (isActive) {
        forceUpdate((v) => v + 1);
      }
    });
    return () => {
      isActive = false;
    };
  }, [language]);

  /**
   * 翻译函数
   * @param key 翻译键，支持点号分隔的嵌套路径，例如 'settings.title'
   * @param fallback 如果找不到翻译时的回退值
   * @returns 翻译后的文本
   */
  const translate = useCallback(
    (key: string, substitutions?: I18nSubstitutions, fallback?: string): string => {
      return t(language, key, substitutions, fallback);
    },
    [language]
  );

  return {
    t: translate,
    language,
    uiLanguage,
  };
}
