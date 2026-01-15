import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';

export interface ConfigState {
  theme: boolean; // true = dark, false = light
  updatedAt: string; // 配置最后修改日期（ISO 8601 格式）
  // 可以在这里添加其他配置项
  // example: language: string;
  // example: fontSize: number;
}

const initialState: ConfigState = {
  theme: false, // 默认亮色主题
  updatedAt: dayjs().toISOString(), // 初始化时设置为当前时间
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

export const { setTheme, loadConfig } = configSlice.actions;
export default configSlice.reducer;
