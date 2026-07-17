export type SearchEngine = {
  key: string;
  name: string;
  favicon: string;
  searchFunction: (text: string) => void;
};

export type BuiltInSiteIcon =
  | 'youtube'
  | 'chatgpt'
  | 'github'
  | 'x'
  | 'claude'
  | 'gemini'
  | 'copilot'
  | 'deepseek'
  | 'perplexity'
  | 'grok'
  | 'qwen'
  | 'kimi'
  | 'doubao'
  | 'yuanbao'
  | 'poe'
  | 'mistral'
  | 'metaai'
  | 'notebooklm'
  | 'midjourney'
  | 'runway'
  | 'suno'
  | 'canva'
  | 'huggingface'
  | 'githubcopilot'
  | 'cursor'
  | 'replit'
  | 'bilibili'
  | 'tiktok'
  | 'vimeo'
  | 'twitch'
  | 'bbc'
  | 'spotify'
  | 'applemusic'
  | 'youtubemusic'
  | 'neteasecloudmusic'
  | 'qqmusic'
  | 'soundcloud'
  | 'bandcamp'
  | 'stackoverflow'
  | 'v2ex'
  | 'hackernews'
  | 'reddit'
  | 'csdn'
  | 'juejin'
  | 'zhihu'
  | 'mdn'
  | 'reuters'
  | 'apnews'
  | 'xinhua'
  | 'thepaper'
  | 'kr36'
  | 'googlenews'
  | 'techcrunch';

/** 导航栏项目（底部导航 / 配置页共用） */
export interface NavItem {
  id: string;
  label: string;
  url: string;
  /** 预设图标 key，仅用于内置站点 */
  icon?: BuiltInSiteIcon;
  /** 站点图标地址（通过 Google Favicon API 自动生成） */
  iconUrl?: string;
  /** 用户上传并清洗后的 SVG 源码，作为配置的一部分持久化和同步 */
  customIconSvg?: string;
}
