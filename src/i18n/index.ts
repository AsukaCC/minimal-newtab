export type Language = 'zh-CN' | 'en-US';
export type I18nSubstitutions = string | string[];

type MessageEntry = {
  message: string;
  placeholders?: Record<string, { content: string }>;
};

const languageToLocale: Record<Language, string> = {
  'zh-CN': 'zh_CN',
  'en-US': 'en',
};

const localeCache = new Map<string, Record<string, MessageEntry>>();

/**
 * 获取 Chrome UI 语言，如果不可用则回退到浏览器语言
 */
export function getUILanguage(): string {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage) {
    return chrome.i18n.getUILanguage();
  }

  return navigator.language || (navigator as any).userLanguage || 'en';
}

export function normalizeLanguage(lang: string): Language {
  return lang?.startsWith('zh') ? 'zh-CN' : 'en-US';
}

export async function loadLocaleMessages(language: Language): Promise<void> {
  const locale = languageToLocale[language];
  if (!locale || localeCache.has(locale)) {
    return;
  }

  try {
    const url =
      typeof chrome !== 'undefined' && chrome.runtime?.getURL
        ? chrome.runtime.getURL(`_locales/${locale}/messages.json`)
        : `/_locales/${locale}/messages.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load locale messages: ${response.status}`);
    }
    const json = (await response.json()) as Record<string, MessageEntry>;
    localeCache.set(locale, json);
  } catch (error) {
    console.warn('[i18n] loadLocaleMessages failed:', error);
  }
}

function applySubstitutions(
  message: string,
  placeholders: MessageEntry['placeholders'],
  substitutions?: I18nSubstitutions
): string {
  if (!placeholders || substitutions === undefined) {
    return message;
  }

  const subs = Array.isArray(substitutions) ? substitutions : [substitutions];
  let output = message;

  Object.entries(placeholders).forEach(([name, info]) => {
    const index = parseInt(info.content.replace(/\$/g, ''), 10) - 1;
    if (Number.isFinite(index) && subs[index] !== undefined) {
      const value = String(subs[index]);
      const reg = new RegExp(`\\$${name}\\$`, 'gi');
      output = output.replace(reg, value);
    }
  });

  return output;
}

/**
 * 翻译函数，支持手动语言覆盖
 * @param language 语言
 * @param key message key，例如 "settings_title"
 * @param substitutions 可选占位符替换
 * @param fallback 如果找不到翻译时的回退值
 * @returns 翻译后的文本
 */
export function t(
  language: Language,
  key: string,
  substitutions?: I18nSubstitutions,
  fallback?: string
): string {
  const locale = languageToLocale[language];
  const messages = locale ? localeCache.get(locale) : undefined;
  const entry = messages?.[key];

  if (entry?.message) {
    return applySubstitutions(entry.message, entry.placeholders, substitutions);
  }

  try {
    const message =
      typeof chrome !== 'undefined' && chrome.i18n?.getMessage
        ? chrome.i18n.getMessage(key, substitutions as any)
        : '';

    if (message) {
      return message;
    }
  } catch (error) {
    console.warn('[i18n] getMessage failed:', error);
  }

  return fallback || key;
}
