import { configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import configReducer from './configSlice';
import { chromeStorage } from './chromeStorage';

// 配置持久化
// 注意：persistReducer 直接包装 configReducer，所以 key 应该是 'config'
// 不需要 whitelist，因为只持久化这一个 slice
const persistConfig = {
  key: 'config', // 存储键名
  storage: chromeStorage,
  // 可选：配置版本号，用于迁移
  // version: 1,
};

// 创建持久化的 reducer
const persistedReducer = persistReducer(persistConfig, configReducer);

export const store = configureStore({
  reducer: {
    config: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// 调试：监听持久化状态
persistor.subscribe(() => {
  const state = store.getState();
  console.log('[redux-persist] Current config state:', state.config);
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
