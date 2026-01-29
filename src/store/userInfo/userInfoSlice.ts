/**
 * 用户信息 Slice - 管理登录状态和历史记录
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { SyncHistory } from '../../services/syncService';

/**
 * 用户信息状态接口
 */
export interface UserInfoState {
  // 登录状态
  isLoggedIn: boolean | null; // null 表示检查中，true 表示已登录，false 表示未登录
  isChecking: boolean; // 是否正在检查登录状态
  
  // 用户账户信息
  userEmail: string | null; // 登录用户的邮箱
  userAvatar: string | null; // 登录用户的头像 URL
  
  // 历史记录
  histories: SyncHistory[]; // 同步历史记录列表
  isLoadingHistories: boolean; // 是否正在加载历史记录
  historiesLastUpdated: number | null; // 历史记录最后更新时间戳
}

/**
 * 初始状态
 */
const initialState: UserInfoState = {
  isLoggedIn: null,
  isChecking: false,
  userEmail: null,
  userAvatar: null,
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
     * 开始检查登录状态
     */
    setChecking: (state, action: PayloadAction<boolean>) => {
      state.isChecking = action.payload;
    },

    /**
     * 设置登录状态
     */
    setLoggedIn: (state, action: PayloadAction<boolean | null>) => {
      state.isLoggedIn = action.payload;
      state.isChecking = false;
      
      // 如果登出，清空历史记录和用户信息
      if (action.payload === false) {
        state.histories = [];
        state.historiesLastUpdated = null;
        state.userEmail = null;
        state.userAvatar = null;
      }
    },

    /**
     * 设置用户邮箱
     */
    setUserEmail: (state, action: PayloadAction<string | null>) => {
      state.userEmail = action.payload;
    },

    /**
     * 设置用户头像
     */
    setUserAvatar: (state, action: PayloadAction<string | null>) => {
      state.userAvatar = action.payload;
    },

    /**
     * 重置用户信息状态
     */
    resetUserInfo: (state) => {
      state.isLoggedIn = null;
      state.isChecking = false;
      state.userEmail = null;
      state.userAvatar = null;
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
      // 限制数量（最多4条）
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
  setChecking,
  setLoggedIn,
  setUserEmail,
  setUserAvatar,
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
