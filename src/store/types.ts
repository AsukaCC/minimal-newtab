/**
 * Store 类型定义
 */

import type { store } from './index';

/**
 * RootState - 根状态类型
 */
export type RootState = ReturnType<typeof store.getState>;

/**
 * AppDispatch - Dispatch 类型
 */
export type AppDispatch = typeof store.dispatch;
