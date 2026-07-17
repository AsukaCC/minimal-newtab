import type { BuiltInSiteIcon, NavItem } from '../types';

export type AiWebsiteCategory =
  | 'assistant'
  | 'search'
  | 'creative'
  | 'developer';

export type WebsiteCategory =
  | AiWebsiteCategory
  | 'video'
  | 'music'
  | 'technology'
  | 'news';

export interface BuiltInWebsite extends NavItem {
  icon: BuiltInSiteIcon;
  category?: WebsiteCategory;
  aliases?: string[];
}

const existingWebsites: BuiltInWebsite[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com',
    icon: 'youtube',
    category: 'video',
  },
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com',
    icon: 'github',
    category: 'technology',
  },
  { id: 'x', label: 'X', url: 'https://x.com', icon: 'x', category: 'news' },
];

export const aiWebsiteLibrary: BuiltInWebsite[] = [
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    url: 'https://chatgpt.com',
    icon: 'chatgpt',
    category: 'assistant',
    aliases: ['chat.openai.com'],
  },
  {
    id: 'claude',
    label: 'Claude',
    url: 'https://claude.ai',
    icon: 'claude',
    category: 'assistant',
    aliases: ['claude.com'],
  },
  {
    id: 'gemini',
    label: 'Gemini',
    url: 'https://gemini.google.com',
    icon: 'gemini',
    category: 'assistant',
  },
  {
    id: 'copilot',
    label: 'Microsoft Copilot',
    url: 'https://copilot.microsoft.com',
    icon: 'copilot',
    category: 'assistant',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    url: 'https://chat.deepseek.com',
    icon: 'deepseek',
    category: 'assistant',
    aliases: ['deepseek.com'],
  },
  {
    id: 'kimi',
    label: 'Kimi',
    url: 'https://www.kimi.com',
    icon: 'kimi',
    category: 'assistant',
    aliases: ['kimi.moonshot.cn'],
  },
  {
    id: 'qwen',
    label: '通义千问',
    url: 'https://www.qianwen.com',
    icon: 'qwen',
    category: 'assistant',
    aliases: ['chat.qwen.ai', 'tongyi.aliyun.com'],
  },
  {
    id: 'doubao',
    label: '豆包',
    url: 'https://www.doubao.com/chat/',
    icon: 'doubao',
    category: 'assistant',
  },
  {
    id: 'yuanbao',
    label: '腾讯元宝',
    url: 'https://yuanbao.tencent.com/chat/',
    icon: 'yuanbao',
    category: 'assistant',
  },
  {
    id: 'grok',
    label: 'Grok',
    url: 'https://grok.com',
    icon: 'grok',
    category: 'assistant',
  },
  {
    id: 'poe',
    label: 'Poe',
    url: 'https://poe.com',
    icon: 'poe',
    category: 'assistant',
  },
  {
    id: 'mistral',
    label: 'Le Chat',
    url: 'https://chat.mistral.ai/chat',
    icon: 'mistral',
    category: 'assistant',
  },
  {
    id: 'metaai',
    label: 'Meta AI',
    url: 'https://www.meta.ai',
    icon: 'metaai',
    category: 'assistant',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    url: 'https://www.perplexity.ai',
    icon: 'perplexity',
    category: 'search',
  },
  {
    id: 'notebooklm',
    label: 'NotebookLM',
    url: 'https://notebooklm.google.com',
    icon: 'notebooklm',
    category: 'search',
  },
  {
    id: 'midjourney',
    label: 'Midjourney',
    url: 'https://www.midjourney.com',
    icon: 'midjourney',
    category: 'creative',
  },
  {
    id: 'runway',
    label: 'Runway',
    url: 'https://app.runwayml.com',
    icon: 'runway',
    category: 'creative',
  },
  {
    id: 'suno',
    label: 'Suno',
    url: 'https://suno.com',
    icon: 'suno',
    category: 'creative',
  },
  {
    id: 'canva',
    label: 'Canva AI',
    url: 'https://www.canva.com/ai-assistant/',
    icon: 'canva',
    category: 'creative',
  },
  {
    id: 'huggingface',
    label: 'Hugging Face',
    url: 'https://huggingface.co',
    icon: 'huggingface',
    category: 'developer',
  },
  {
    id: 'githubcopilot',
    label: 'GitHub Copilot',
    url: 'https://github.com/features/copilot',
    icon: 'githubcopilot',
    category: 'developer',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    url: 'https://cursor.com',
    icon: 'cursor',
    category: 'developer',
  },
  {
    id: 'replit',
    label: 'Replit AI',
    url: 'https://replit.com/ai',
    icon: 'replit',
    category: 'developer',
  },
];

export const generalWebsiteLibrary: BuiltInWebsite[] = [
  {
    id: 'bilibili',
    label: '哔哩哔哩',
    url: 'https://www.bilibili.com',
    icon: 'bilibili',
    category: 'video',
  },
  {
    id: 'douyin',
    label: '抖音',
    url: 'https://www.douyin.com',
    icon: 'tiktok',
    category: 'video',
  },
  {
    id: 'vimeo',
    label: 'Vimeo',
    url: 'https://vimeo.com',
    icon: 'vimeo',
    category: 'video',
  },
  {
    id: 'twitch',
    label: 'Twitch',
    url: 'https://www.twitch.tv',
    icon: 'twitch',
    category: 'video',
  },
  {
    id: 'spotify',
    label: 'Spotify',
    url: 'https://open.spotify.com',
    icon: 'spotify',
    category: 'music',
  },
  {
    id: 'apple-music',
    label: 'Apple Music',
    url: 'https://music.apple.com',
    icon: 'applemusic',
    category: 'music',
  },
  {
    id: 'youtube-music',
    label: 'YouTube Music',
    url: 'https://music.youtube.com',
    icon: 'youtubemusic',
    category: 'music',
  },
  {
    id: 'netease-cloud-music',
    label: '网易云音乐',
    url: 'https://music.163.com',
    icon: 'neteasecloudmusic',
    category: 'music',
  },
  {
    id: 'qq-music',
    label: 'QQ 音乐',
    url: 'https://y.qq.com',
    icon: 'qqmusic',
    category: 'music',
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    url: 'https://soundcloud.com',
    icon: 'soundcloud',
    category: 'music',
  },
  {
    id: 'bandcamp',
    label: 'Bandcamp',
    url: 'https://bandcamp.com',
    icon: 'bandcamp',
    category: 'music',
  },
  {
    id: 'stackoverflow',
    label: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    icon: 'stackoverflow',
    category: 'technology',
  },
  {
    id: 'v2ex',
    label: 'V2EX',
    url: 'https://www.v2ex.com',
    icon: 'v2ex',
    category: 'technology',
  },
  {
    id: 'hacker-news',
    label: 'Hacker News',
    url: 'https://news.ycombinator.com',
    icon: 'hackernews',
    category: 'technology',
  },
  {
    id: 'reddit-programming',
    label: 'Reddit Programming',
    url: 'https://www.reddit.com/r/programming/',
    icon: 'reddit',
    category: 'technology',
  },
  {
    id: 'csdn',
    label: 'CSDN',
    url: 'https://www.csdn.net',
    icon: 'csdn',
    category: 'technology',
  },
  {
    id: 'juejin',
    label: '稀土掘金',
    url: 'https://juejin.cn',
    icon: 'juejin',
    category: 'technology',
  },
  {
    id: 'zhihu',
    label: '知乎',
    url: 'https://www.zhihu.com',
    icon: 'zhihu',
    category: 'technology',
  },
  {
    id: 'mdn',
    label: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    icon: 'mdn',
    category: 'technology',
  },
  {
    id: 'reuters',
    label: 'Reuters',
    url: 'https://www.reuters.com',
    icon: 'reuters',
    category: 'news',
  },
  {
    id: 'ap-news',
    label: 'AP News',
    url: 'https://apnews.com',
    icon: 'apnews',
    category: 'news',
  },
  {
    id: 'bbc-news',
    label: 'BBC News',
    url: 'https://www.bbc.com/news',
    icon: 'bbc',
    category: 'news',
  },
  {
    id: 'xinhua',
    label: '新华网',
    url: 'https://www.news.cn',
    icon: 'xinhua',
    category: 'news',
  },
  {
    id: 'the-paper',
    label: '澎湃新闻',
    url: 'https://www.thepaper.cn',
    icon: 'thepaper',
    category: 'news',
  },
  {
    id: '36kr',
    label: '36氪',
    url: 'https://36kr.com',
    icon: 'kr36',
    category: 'news',
  },
  {
    id: 'google-news',
    label: 'Google News',
    url: 'https://news.google.com',
    icon: 'googlenews',
    category: 'news',
  },
  {
    id: 'techcrunch',
    label: 'TechCrunch',
    url: 'https://techcrunch.com',
    icon: 'techcrunch',
    category: 'news',
  },
];

export const builtInWebsites: BuiltInWebsite[] = [
  ...existingWebsites,
  ...aiWebsiteLibrary,
  ...generalWebsiteLibrary,
];

const defaultWebsiteIds = [
  'youtube',
  'chatgpt',
  'claude',
  'gemini',
  'deepseek',
  'perplexity',
  'kimi',
  'qwen',
  'github',
  'x',
];

export const defaultNavItems: NavItem[] = defaultWebsiteIds.map((id) => {
  const website = builtInWebsites.find((item) => item.id === id);
  if (!website) throw new Error(`Unknown built-in website: ${id}`);
  return { ...website, aliases: undefined } as NavItem;
});

interface NormalizedWebsiteUrl {
  host: string;
  path: string;
}

function normalizeWebsiteUrl(value: string): NormalizedWebsiteUrl | null {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    return {
      host: url.hostname.toLowerCase().replace(/^www\./, ''),
      path: path.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function findBuiltInWebsiteByUrl(
  url: string,
): BuiltInWebsite | undefined {
  const target = normalizeWebsiteUrl(url);
  if (!target) return undefined;

  return builtInWebsites
    .flatMap((website) =>
      [website.url, ...(website.aliases || [])].map((candidate) => ({
        website,
        candidate: normalizeWebsiteUrl(candidate),
      })),
    )
    .filter(({ candidate }) => {
      if (!candidate || candidate.host !== target.host) return false;
      return candidate.path === '/' || target.path.startsWith(candidate.path);
    })
    .sort(
      (left, right) =>
        (right.candidate?.path.length || 0) -
        (left.candidate?.path.length || 0),
    )[0]?.website;
}
