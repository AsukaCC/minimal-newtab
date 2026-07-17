import type React from 'react';
import type { SimpleIcon } from 'simple-icons';
import {
  siApplemusic,
  siBandcamp,
  siBilibili,
  siCsdn,
  siCursor,
  siDeepseek,
  siGithubcopilot,
  siGooglegemini,
  siGooglenews,
  siHuggingface,
  siJuejin,
  siKimi,
  siMdnwebdocs,
  siMetaai,
  siMistralai,
  siNotebooklm,
  siNeteasecloudmusic,
  siPerplexity,
  siPoe,
  siQwen,
  siReddit,
  siReplit,
  siSoundcloud,
  siSpotify,
  siStackoverflow,
  siSuno,
  siTechcrunch,
  siTiktok,
  siTwitch,
  siV2ex,
  siVimeo,
  siYcombinator,
  siYoutubemusic,
  siZhihu,
} from 'simple-icons/icons';
import type { BuiltInSiteIcon } from '../types';
import {
  ChatGPT,
  Claude,
  GitHub,
  X,
  YouTube,
  createSvgIcon,
} from './svgIcon';

type IconComponent = React.FC<{ className?: string }>;

function createBrandIcon(svgOrIcon: string | SimpleIcon): IconComponent {
  const svg = typeof svgOrIcon === 'string'
    ? svgOrIcon
    : `<svg viewBox="0 0 24 24"><path d="${svgOrIcon.path}"/></svg>`;
  return createSvgIcon(
    svg.replace('<svg ', '<svg fill="currentColor" aria-hidden="true" '),
  );
}

const Copilot = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M7.1 4.2A5 5 0 0 1 12 8a5 5 0 0 1 9.8 1.5A5 5 0 0 1 18 14.4a6 6 0 0 1-12 0A5 5 0 0 1 7.1 4.2Zm.4 7.4a2.8 2.8 0 0 0 .4 5.6h1.2V12H7.5Zm7.4.4v5.2h1.2a2.8 2.8 0 0 0 .4-5.6L14.9 12Zm-3.8-2.8v8.6h1.8V9.2h-1.8Z"/></svg>',
);

const Grok = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M4.2 3h15.6L13 10.1l6.8 10.9h-4.2l-5.1-8.1L6.7 17H3l5.8-6.1L4.2 3Zm6.9 5.4L12.5 7H9.9l1.2 1.4Z"/></svg>',
);

const Doubao = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Zm0 4.1a5.7 5.7 0 0 1 5.3 7.8 4.7 4.7 0 0 0-7.5-3.5 4.7 4.7 0 0 0-1.6 5.1A5.7 5.7 0 0 1 12 6.3Zm1.4 6.1a2.5 2.5 0 1 1-2.5 2.5 2.5 2.5 0 0 1 2.5-2.5Z"/></svg>',
);

const Yuanbao = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M12 1.8 21 7v10l-9 5.2L3 17V7l9-5.2Zm0 4.1L7 8.8v6.4l3 1.7v-4.1L7.8 9h3l1.2 2.1L13.2 9h3L14 12.8v4.1l3-1.7V8.8l-5-2.9Z"/></svg>',
);

const Midjourney = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M2 18h20l-2 3H5l-3-3Zm9-15v13H4l7-13Zm2 4 8 9h-8V7Z"/></svg>',
);

const Runway = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M4 3h8.2a6.1 6.1 0 0 1 2.4 11.7L21 21h-5.1l-5.4-5.5H8V21H4V3Zm4 3.7v5.1h4a2.6 2.6 0 0 0 0-5.1H8Z"/></svg>',
);

const Canva = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M15.8 5.1c-1.1-1-2.6-1.5-4.2-1.5-4.4 0-7.8 3.6-7.8 8.4s3.4 8.4 7.8 8.4c2.4 0 4.6-1.1 6-3l-2.7-2.1a4 4 0 0 1-3.2 1.6c-2.5 0-4.3-2-4.3-4.9s1.8-4.9 4.3-4.9c.8 0 1.5.2 2.1.6l2-2.6Zm2.8 2.7a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',
);

const Bbc = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M1 6h6.5v12H1zm7.75 0h6.5v12h-6.5zm7.75 0H23v12h-6.5z"/><text x="4.25" y="15" fill="#fff" font-family="Arial" font-size="7" font-weight="700" text-anchor="middle">B</text><text x="12" y="15" fill="#fff" font-family="Arial" font-size="7" font-weight="700" text-anchor="middle">B</text><text x="19.75" y="15" fill="#fff" font-family="Arial" font-size="7" font-weight="700" text-anchor="middle">C</text></svg>',
);

const QqMusic = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 6.3 17.8l-2.5-2.6A6.4 6.4 0 1 1 18.4 12c0 1-.2 1.9-.6 2.7l2.8 2.1A10 10 0 0 0 12 2Zm1.5 4v7.2a2.8 2.8 0 1 0 1.8 2.6V9.1l3-.7V5.2L13.5 6Z"/></svg>',
);

const Reuters = createBrandIcon(
  '<svg viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5" stroke-dasharray="1 2.2"/><circle cx="12" cy="12" r="5.3" stroke-dasharray="1 1.8"/><circle cx="12" cy="12" r="2.2"/></g></svg>',
);

const ApNews = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M2 19 7.3 5h3.8l5.2 14h-3.7l-1-3H6.7l-1 3H2Zm5.7-6h2.9L9.2 8.7 7.7 13ZM17 5h3.2a3.8 3.8 0 0 1 0 7.6h-.1V19H17V5Zm3.1 3v1.7h.2a.9.9 0 0 0 0-1.7h-.2Z"/></svg>',
);

const Xinhua = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M3 3h5.1l4 6 4-6H21l-6.4 9 6.7 9h-5.2L12 15l-4.1 6H3l6.4-9L3 3Z"/></svg>',
);

const ThePaper = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M4 3h9.2a6.3 6.3 0 0 1 0 12.6H8V21H4V3Zm4 3.6V12h5a2.7 2.7 0 0 0 0-5.4H8Z"/></svg>',
);

const Kr36 = createBrandIcon(
  '<svg viewBox="0 0 24 24"><path d="M2 5h7.2v3H5v2h3.2a4.5 4.5 0 0 1 0 9H2v-3h6.2a1.5 1.5 0 0 0 0-3H3v-3h3.2V8H2V5Zm12 0h3.5l-2.7 5.1a4.8 4.8 0 1 1-.8 2.7V5Zm4.8 8.8a1.8 1.8 0 1 0-3.6 0 1.8 1.8 0 0 0 3.6 0Z"/></svg>',
);

export const siteIconByKey: Record<BuiltInSiteIcon, IconComponent> = {
  youtube: YouTube,
  chatgpt: ChatGPT,
  github: GitHub,
  x: X,
  claude: Claude,
  gemini: createBrandIcon(siGooglegemini),
  copilot: Copilot,
  deepseek: createBrandIcon(siDeepseek),
  perplexity: createBrandIcon(siPerplexity),
  grok: Grok,
  qwen: createBrandIcon(siQwen),
  kimi: createBrandIcon(siKimi),
  doubao: Doubao,
  yuanbao: Yuanbao,
  poe: createBrandIcon(siPoe),
  mistral: createBrandIcon(siMistralai),
  metaai: createBrandIcon(siMetaai),
  notebooklm: createBrandIcon(siNotebooklm),
  midjourney: Midjourney,
  runway: Runway,
  suno: createBrandIcon(siSuno),
  canva: Canva,
  huggingface: createBrandIcon(siHuggingface),
  githubcopilot: createBrandIcon(siGithubcopilot),
  cursor: createBrandIcon(siCursor),
  replit: createBrandIcon(siReplit),
  bilibili: createBrandIcon(siBilibili),
  tiktok: createBrandIcon(siTiktok),
  vimeo: createBrandIcon(siVimeo),
  twitch: createBrandIcon(siTwitch),
  bbc: Bbc,
  spotify: createBrandIcon(siSpotify),
  applemusic: createBrandIcon(siApplemusic),
  youtubemusic: createBrandIcon(siYoutubemusic),
  neteasecloudmusic: createBrandIcon(siNeteasecloudmusic),
  qqmusic: QqMusic,
  soundcloud: createBrandIcon(siSoundcloud),
  bandcamp: createBrandIcon(siBandcamp),
  stackoverflow: createBrandIcon(siStackoverflow),
  v2ex: createBrandIcon(siV2ex),
  hackernews: createBrandIcon(siYcombinator),
  reddit: createBrandIcon(siReddit),
  csdn: createBrandIcon(siCsdn),
  juejin: createBrandIcon(siJuejin),
  zhihu: createBrandIcon(siZhihu),
  mdn: createBrandIcon(siMdnwebdocs),
  reuters: Reuters,
  apnews: ApNews,
  xinhua: Xinhua,
  thepaper: ThePaper,
  kr36: Kr36,
  googlenews: createBrandIcon(siGooglenews),
  techcrunch: createBrandIcon(siTechcrunch),
};
