/**
 * Chrome 同步服务导出
 * 
 * 使用示例:
 * ```typescript
 * import { 
 *   uploadConfig, 
 *   getSyncHistory 
 * } from '@/services';
 * ```
 */

// Chrome 同步服务
export {
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
  exportSyncHistory,
  importSyncHistory,
  
  // 自动同步
  startAutoSync,
  stopAutoSync,
  resetAutoSyncTimer,
  
  // 辅助函数
  getLocalConfig,
  getSyncStorageDiagnostics,
  findHistoryByConfigId,
  
  // 类型定义
  type SyncHistory,
  type SyncHistoryList,
  type SyncConfigStorage,
  type SyncConfigParsed,
  type ChromeSyncData,
  
  // 历史记录管理器
  historyBatchManager,
} from './chromeSyncService';

// 常量
export { MAX_HISTORY_COUNT } from './chromeSyncService';
