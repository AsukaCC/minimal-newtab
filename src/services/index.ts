/**
 * Firebase 同步服务导出
 * 
 * 使用示例:
 * ```typescript
 * import { 
 *   initializeFirebase, 
 *   uploadConfig, 
 *   getSyncHistory 
 * } from '@/services';
 * ```
 */

// Firebase 同步服务
export {
  // 初始化
  initializeFirebaseConfig,
  initializeFirebase,
  saveFirebaseConfig,
  clearFirebaseConfig,
  
  // 认证
  getAccessToken,
  isLoggedIn,
  getUserInfo,
  logout,
  
  // 同步操作
  uploadConfig,
  pullConfig,
  syncConfig,
  autoSyncConfig,
  
  // 历史记录管理
  getSyncHistory,
  deleteSyncHistory,
  restoreFromHistory,
  clearAllSyncHistory,
  
  // 导入导出
  exportCurrentConfig,
  importToCurrentConfig,
  
  // 类型定义
  type FirebaseConfig,
  type SyncHistory,
  type SyncHistoryList,
  type SyncConfigStorage,
  type SyncConfigParsed,
  type UserSyncData,
  
  // 历史记录管理器
  historyBatchManager,
} from './firebaseSyncService';

// 常量
export { MAX_HISTORY_COUNT } from './firebaseSyncService';
