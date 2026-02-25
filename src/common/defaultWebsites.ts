import type { NavItem } from '../types';

/**
 * 默认导航栏项目（内置站点）
 */
export const defaultNavItems: NavItem[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    url: 'https://www.youtube.com',
    icon: 'youtube',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT',
    url: 'https://chat.openai.com',
    icon: 'chatgpt',
  },
  { id: 'github', label: 'GitHub', url: 'https://github.com', icon: 'github' },
  { id: 'x', label: 'X', url: 'https://x.com', icon: 'x' },
  { id: 'claude', label: 'Claude', url: 'https://claude.ai', icon: 'claude' },
];
