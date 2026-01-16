import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';

export interface ConfigState {
  theme: boolean; // true = dark, false = light
  updatedAt: string; // 配置最后修改日期（ISO 8601 格式）
  chooseEngine: string; // 选择的搜索引擎 key
  isDirectLink: boolean; // true: 当前标签页打开；false: 新标签页打开
  themeColor: string; // 主题色，例如 '#667eea'
  // 可以在这里添加其他配置项
  // example: language: string;
  // example: fontSize: number;
}

const initialState: ConfigState = {
  theme: false, // 默认亮色主题
  updatedAt: dayjs().toISOString(), // 初始化时设置为当前时间
  chooseEngine: 'default',
  isDirectLink: false,
  themeColor: '#667eea', // 默认主题色（蓝紫色）
};

const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<boolean>) => {
      state.theme = action.payload;
      state.updatedAt = dayjs().toISOString(); // 更新修改日期
      // 调试：确认主题已更新
      console.log('[configSlice] setTheme called:', action.payload, 'updatedAt:', state.updatedAt);
    },
    setChooseEngine: (state, action: PayloadAction<string>) => {
      state.chooseEngine = action.payload;
      state.updatedAt = dayjs().toISOString();
    },
    setIsDirectLink: (state, action: PayloadAction<boolean>) => {
      state.isDirectLink = action.payload;
      state.updatedAt = dayjs().toISOString();
    },
    setThemeColor: (state, action: PayloadAction<string>) => {
      state.themeColor = action.payload;
      state.updatedAt = dayjs().toISOString();
    },
    // 从存储中加载配置（不更新修改日期）
    loadConfig: (state, action: PayloadAction<Partial<ConfigState>>) => {
      return { ...state, ...action.payload };
    },
    // 可以添加其他配置的 reducer
    // setLanguage: (state, action: PayloadAction<string>) => {
    //   state.language = action.payload;
    //   state.updatedAt = dayjs().toISOString();
    // },
  },
});

export const { setTheme, setChooseEngine, setIsDirectLink, setThemeColor, loadConfig } =
  configSlice.actions;
export default configSlice.reducer;
