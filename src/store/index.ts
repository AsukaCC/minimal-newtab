/**
 * Store 统一导出入口
 *
 * 这是 store 模块的主入口文件，统一导出所有 store 相关的类型、hooks 和实例
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // web: localStorage
import { configReducer } from './config';
import { userInfoReducer } from './userInfo';

/**
 * UserInfo 持久化配置 - 只持久化 userEmail / userName / userAvatar
 */
const userInfoPersistConfig = {
  key: 'userInfo',
  storage,
  whitelist: ['userEmail', 'userName', 'userAvatar'], // 只持久化 userEmail / userName / userAvatar
};

/**
 * Root Reducer - 组合所有 reducer
 */
const rootReducer = combineReducers({
  config: configReducer,
  userInfo: persistReducer(userInfoPersistConfig, userInfoReducer),
});

/**
 * 持久化配置
 */
const persistConfig = {
  key: 'root', // 存储 key
  storage, // storage / sessionStorage / 自定义
  whitelist: ['config', 'userInfo'], // 持久化的 slice
  // blacklist: ['temp'], // 或使用黑名单（二选一）
  version: 1, // 版本号（配合迁移）
};

/**
 * 创建持久化的 reducer
 */
const persistedReducer = persistReducer(persistConfig, rootReducer);

/**
 * 配置并创建 Redux store
 */
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (gDM) =>
    gDM({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

/**
 * 持久化存储实例
 */
export const persistor = persistStore(store);

// 重新导出配置相关的 actions 和类型
export {
  setTheme,
  setChooseEngine,
  setIsDirectLink,
  setThemeColor,
  setLanguage,
  setNavItems,
  setShowNavBar,
  loadConfig,
  resetConfig,
  generateConfigId,
} from './config';
export type { ConfigState } from './config';

// 重新导出用户信息相关的 actions 和类型
export {
  setChecking,
  setLoggedIn,
  setUserEmail,
  setUserName,
  setUserAvatar,
  resetUserInfo,
  setLoadingHistories,
  setHistories,
  addHistory,
  removeHistory,
  updateHistory,
  clearHistories,
} from './userInfo';
export type { UserInfoState } from './userInfo';

// 向后兼容：导出旧的 auth 相关名称
export {
  setChecking as setAuthChecking,
  setLoggedIn as setAuthLoggedIn,
  resetUserInfo as resetAuth,
} from './userInfo';
export type { UserInfoState as AuthState } from './userInfo';
