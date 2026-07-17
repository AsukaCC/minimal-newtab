/**
 * Chrome 同步服务 - 简单使用示例
 * 
 * 复制此代码到你的项目中使用
 */

import {
  uploadConfig,
  pullConfig,
  syncConfig,
  getSyncHistory,
  restoreFromHistory,
  deleteSyncHistory,
  exportCurrentConfig,
  importToCurrentConfig,
  startAutoSync,
} from './chromeSyncService';
import { useState } from 'react';

// ==================== 初始化 ====================

/**
 * Chrome 同步会自动工作，无需额外初始化
 * 如果需要启动自动同步，可以调用此函数
 */
export function startChromeSync() {
  startAutoSync();
  console.log('✓ Chrome 自动同步已启动');
}

// ==================== 同步相关 ====================

/**
 * 上传配置到 Chrome Storage
 */
export async function upload() {
  try {
    const success = await uploadConfig();
    if (success) {
      console.log('✓ 配置已上传到云端');
    }
    return success;
  } catch (error: any) {
    console.error('✗ 上传失败:', error.message);
    return false;
  }
}

/**
 * 从 Chrome Storage 拉取配置
 */
export async function download() {
  try {
    const success = await pullConfig();
    if (success) {
      console.log('✓ 配置已从云端下载');
    }
    return success;
  } catch (error: any) {
    console.error('✗ 下载失败:', error.message);
    return false;
  }
}

/**
 * 智能同步（自动判断上传或下载）
 */
export async function sync() {
  try {
    const result = await syncConfig();
    console.log(`✓ 同步完成：${result.message}`);
    return result;
  } catch (error: any) {
    console.error('✗ 同步失败:', error.message);
    throw error;
  }
}

// ==================== 历史记录相关 ====================

/**
 * 获取所有历史记录
 */
export async function getHistories() {
  try {
    const histories = await getSyncHistory();
    return histories;
  } catch (error: any) {
    console.error('✗ 获取历史记录失败:', error.message);
    return [];
  }
}

/**
 * 恢复历史记录
 */
export async function restoreHistory(historyId: string) {
  try {
    const success = await restoreFromHistory(historyId);
    if (success) {
      console.log('✓ 历史记录已恢复');
    }
    return success;
  } catch (error: any) {
    console.error('✗ 恢复失败:', error.message);
    return false;
  }
}

/**
 * 删除历史记录
 */
export async function removeHistory(historyId: string) {
  try {
    const success = await deleteSyncHistory(historyId);
    if (success) {
      console.log('✓ 历史记录已删除');
    }
    return success;
  } catch (error: any) {
    console.error('✗ 删除失败:', error.message);
    return false;
  }
}

// ==================== 导入导出相关 ====================

/**
 * 导出当前配置为 JSON
 */
export async function exportConfig(): Promise<string> {
  try {
    const json = await exportCurrentConfig();
    console.log('✓ 配置已导出');
    return json;
  } catch (error: any) {
    console.error('✗ 导出失败:', error.message);
    throw error;
  }
}

/**
 * 从 JSON 导入配置
 */
export async function importConfig(jsonData: string): Promise<boolean> {
  try {
    const success = await importToCurrentConfig(jsonData);
    if (success) {
      console.log('✓ 配置已导入');
    }
    return success;
  } catch (error: any) {
    console.error('✗ 导入失败:', error.message);
    throw error;
  }
}

// ==================== 使用示例 ====================

/**
 * 完整的使用示例
 */
export async function demo() {
  console.log('=== Chrome 同步服务演示 ===\n');

  // 1. Chrome 同步会自动工作，无需初始化
  console.log('1. Chrome 同步已就绪');

  // 2. 智能同步
  console.log('\n2. 开始同步配置...');
  try {
    const result = await sync();
    console.log('同步结果:', result);
  } catch (error) {
    console.log('同步失败');
  }

  // 3. 获取历史记录
  console.log('\n3. 获取历史记录...');
  const histories = await getHistories();
  console.log(`共有 ${histories.length} 条历史记录`);
  
  if (histories.length > 0) {
    console.log('最新记录:', {
      ID: histories[0].id,
      type: histories[0].type,
      time: new Date(histories[0].updatedAt).toLocaleString(),
    });
  }

  console.log('\n=== 演示完成 ===');
}

// ==================== 在 React 组件中使用示例 ====================

/**
 * React Hook 示例
 * 
 * 使用方式:
 * ```typescript
 * function MyComponent() {
 *   const { sync, loading, error } = useChromeSync();
 *   
 *   return (
 *     <div>
 *       <button onClick={sync} disabled={loading}>
 *         {loading ? '同步中...' : '同步'}
 *       </button>
 *       {error && <div>错误：{error}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useChromeSync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sync = async () => {
    setLoading(true);
    setError(null);
    try {
      await syncConfig();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { sync, loading, error };
}

// 注意：需要安装 @types/react 才能使用上面的 Hook
// npm install --save-dev @types/react
