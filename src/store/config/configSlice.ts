/**
 * 配置 Slice
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import type { NavItem } from '../../types';
import { defaultNavItems } from '../../common/defaultWebsites';

/**
 * 配置状态接口
 */
export interface ConfigState {
  configId?: string; // 配置唯一ID
  theme: boolean; // true = dark, false = light
  updatedAt: string; // 配置最后修改日期（YYYY-MM-DD HH:mm:ss 格式）
  chooseEngine: string; // 选择的搜索引擎 key
  isDirectLink: boolean; // true: 当前标签页打开；false: 新标签页打开
  themeColor: string; // 主题色，例如 '#667eea'
  language: string; // 语言设置，'zh-CN' 或 'en-US'
  navItems?: NavItem[]; // 导航栏项目列表
  showNavBar?: boolean; // 是否显示底部导航栏
  navBarThemeColor?: string; // 底部导航栏图标主题色
  navBarItemGap?: number; // 底部导航栏图标间距（像素）
  navBarIconSize?: number; // 底部导航栏图标大小（像素）
}

/**
 * 检测Chrome浏览器语言，默认返回中文或英文
 * 优先使用 chrome.i18n.getUILanguage() 获取Chrome浏览器界面语言
 * 如果不可用，则回退到 navigator.language
 */
function getSystemLanguage(): string {
  // 优先使用Chrome扩展API获取浏览器语言
  let browserLang: string;

  if (
    typeof chrome !== 'undefined' &&
    chrome.i18n &&
    chrome.i18n.getUILanguage
  ) {
    // Chrome扩展环境，使用Chrome浏览器语言
    browserLang = chrome.i18n.getUILanguage();
  } else {
    // 非扩展环境或API不可用，使用系统语言
    browserLang =
      navigator.language || (navigator as any).userLanguage || 'zh-CN';
  }

  // 如果浏览器语言是中文相关，返回 zh-CN，否则返回 en-US
  if (browserLang.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
}

/**
 * 生成唯一的配置ID
 */
export function generateConfigId(): string {
  return `config-${dayjs().valueOf()}-${Math.random()
    .toString(36)
    .substring(2, 15)}`;
}

/**
 * 初始状态
 */
const initialState: ConfigState = {
  theme: false, // 默认亮色主题
  updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'), // 初始化时设置为当前时间
  chooseEngine: 'default',
  isDirectLink: false,
  themeColor: '#667eea', // 默认主题色（蓝紫色）
  language: getSystemLanguage(), // 默认使用系统语言
  navItems: defaultNavItems, // 默认导航栏项目
  showNavBar: true, // 默认显示底部导航栏
  navBarThemeColor: undefined, // 默认不单独设置导航栏主题色，跟随系统
  navBarItemGap: 2, // 默认图标间距 2px
  navBarIconSize: 32, // 默认图标大小 32px
};

/**
 * 配置 Slice
 */
const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    /**
     * 设置主题（亮色/暗色）
     */
    setTheme: (state, action: PayloadAction<boolean>) => {
      state.theme = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 设置搜索引擎
     */
    setChooseEngine: (state, action: PayloadAction<string>) => {
      state.chooseEngine = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 设置链接打开方式
     */
    setIsDirectLink: (state, action: PayloadAction<boolean>) => {
      state.isDirectLink = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 设置主题色
     */
    setThemeColor: (state, action: PayloadAction<string>) => {
      state.themeColor = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 设置语言
     */
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 设置导航栏项目
     */
    setNavItems: (state, action: PayloadAction<NavItem[]>) => {
      state.navItems = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 控制底部导航栏显示/隐藏
     */
    setShowNavBar: (state, action: PayloadAction<boolean>) => {
      state.showNavBar = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 设置底部导航栏图标主题色
     */
    setNavBarThemeColor: (state, action: PayloadAction<string>) => {
      state.navBarThemeColor = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 设置底部导航栏图标间距
     */
    setNavBarItemGap: (state, action: PayloadAction<number>) => {
      state.navBarItemGap = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 设置底部导航栏图标大小
     */
    setNavBarIconSize: (state, action: PayloadAction<number>) => {
      state.navBarIconSize = action.payload;
      state.updatedAt = dayjs().format('YYYY-MM-DD HH:mm:ss');
    },

    /**
     * 从存储中加载配置（不更新修改日期）
     * 注意：传入的配置应该是已经规范化的数据
     * 注意：不会自动创建 configId，configId 只在同步时创建
     */
    loadConfig: (state, action: PayloadAction<Partial<ConfigState>>) => {
      // 合并状态
      return { ...state, ...action.payload };
    },

    /**
     * 重置配置为默认值
     * 清除 configId，重置所有配置项为初始状态
     */
    resetConfig: (_state) => {
      // 使用相同的语言检测逻辑
      const defaultLanguage = getSystemLanguage();

      return {
        ...initialState,
        updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        language: defaultLanguage,
        navItems: defaultNavItems,
        // 清除 configId
        configId: undefined,
      };
    },
  },
});

// 导出 actions
export const {
  setTheme,
  setChooseEngine,
  setIsDirectLink,
  setThemeColor,
  setLanguage,
  setNavItems,
  setShowNavBar,
  setNavBarThemeColor,
  setNavBarItemGap,
  setNavBarIconSize,
  loadConfig,
  resetConfig,
} = configSlice.actions;

// 导出 reducer
export default configSlice.reducer;
