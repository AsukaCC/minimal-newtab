/**
 * 用户信息 Slice - 管理同步状态和历史记录
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { SyncHistory } from '../../services/chromeSyncService';

/**
 * 用户信息状态接口
 */
export interface UserInfoState {
  // chrome.storage.sync API 可用状态；账户云同步开关由 Chrome 管理
  isSyncEnabled: boolean;
  
  // 历史记录
  histories: SyncHistory[]; // 同步历史记录列表
  isLoadingHistories: boolean; // 是否正在加载历史记录
  historiesLastUpdated: number | null; // 历史记录最后更新时间戳
}

/**
 * 初始状态
 */
const initialState: UserInfoState = {
  isSyncEnabled: false, // 初始化时由 chrome.storage.sync 可用性检测更新
  histories: [],
  isLoadingHistories: false,
  historiesLastUpdated: null,
};

/**
 * 用户信息 Slice
 */
const userInfoSlice = createSlice({
  name: 'userInfo',
  initialState,
  reducers: {
    /**
     * 设置同步启用状态
     */
    setSyncEnabled: (state, action: PayloadAction<boolean>) => {
      state.isSyncEnabled = action.payload;
    },

    /**
     * 重置用户信息状态
     */
    resetUserInfo: (state) => {
      state.histories = [];
      state.isLoadingHistories = false;
      state.historiesLastUpdated = null;
    },

    /**
     * 设置正在加载历史记录
     */
    setLoadingHistories: (state, action: PayloadAction<boolean>) => {
      state.isLoadingHistories = action.payload;
    },

    /**
     * 设置历史记录列表
     */
    setHistories: (state, action: PayloadAction<SyncHistory[]>) => {
      state.histories = action.payload;
      state.isLoadingHistories = false;
      state.historiesLastUpdated = dayjs().valueOf();
    },

    /**
     * 添加历史记录
     */
    addHistory: (state, action: PayloadAction<SyncHistory>) => {
      // 添加到开头
      state.histories.unshift(action.payload);
      // 限制数量（最多 4 条）
      state.histories = state.histories.slice(0, 4);
      state.historiesLastUpdated = dayjs().valueOf();
    },

    /**
     * 删除历史记录
     */
    removeHistory: (state, action: PayloadAction<string>) => {
      state.histories = state.histories.filter((h) => h.id !== action.payload);
      state.historiesLastUpdated = dayjs().valueOf();
    },

    /**
     * 更新历史记录
     */
    updateHistory: (state, action: PayloadAction<{ id: string; updates: Partial<SyncHistory> }>) => {
      const index = state.histories.findIndex((h) => h.id === action.payload.id);
      if (index !== -1) {
        state.histories[index] = { ...state.histories[index], ...action.payload.updates };
        state.historiesLastUpdated = dayjs().valueOf();
      }
    },

    /**
     * 清空历史记录
     */
    clearHistories: (state) => {
      state.histories = [];
      state.historiesLastUpdated = dayjs().valueOf();
    },
  },
});

// 导出 actions
export const {
  setSyncEnabled,
  resetUserInfo,
  setLoadingHistories,
  setHistories,
  addHistory,
  removeHistory,
  updateHistory,
  clearHistories,
} = userInfoSlice.actions;

// 导出 reducer
export default userInfoSlice.reducer;
