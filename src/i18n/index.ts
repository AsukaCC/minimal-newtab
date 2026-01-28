import zhCN from './locales/zh-CN';
import enUS from './locales/en-US';

export type Language = 'zh-CN' | 'en-US';

export type Translations = typeof zhCN;

const translations: Record<Language, Translations> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

/**
 * 获取指定语言的翻译
 * @param language 语言代码
 * @returns 翻译对象
 */
export function getTranslations(language: Language): Translations {
  return translations[language] || translations['zh-CN'];
}

/**
 * 翻译函数，支持嵌套路径，例如 'settings.title'
 * @param language 语言代码
 * @param key 翻译键，支持点号分隔的嵌套路径
 * @param fallback 如果找不到翻译时的回退值
 * @returns 翻译后的文本
 */
export function t(language: Language, key: string, fallback?: string): string {
  const trans = getTranslations(language);
  const keys = key.split('.');
  let value: any = trans;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return fallback || key;
    }
  }

  return typeof value === 'string' ? value : fallback || key;
}

export { zhCN, enUS };
