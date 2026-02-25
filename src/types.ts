export type SearchEngine = {
  key: string;
  name: string;
  favicon: string;
  searchFunction: (text: string) => void;
};

/** 导航栏项目（底部导航 / 配置页共用） */
export interface NavItem {
  id: string;
  label: string;
  url: string;
  /** 预设图标 key，仅用于内置站点（YouTube/GitHub 等） */
  icon?: 'youtube' | 'chatgpt' | 'github' | 'x' | 'claude';
  /** 站点图标地址（通过 Google Favicon API 自动生成） */
  iconUrl?: string;
}
