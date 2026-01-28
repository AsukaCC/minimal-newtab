import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useI18n } from '../../hooks/useI18n';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setHistories, setLoadingHistories } from '../../store';
import { autoSyncConfig, restoreFromHistory, deleteSyncHistory, exportSyncHistory, importSyncHistory, clearAllSyncHistory, findHistoryByConfigId, getLocalConfig, loadHistoryFromDriveWithToken, getAccessToken, resetAutoSyncTimer } from '../../services/syncService';
import dayjs from 'dayjs';
import styles from './index.module.css';
import Button from '../Button';

interface SyncHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SyncHistoryModal: React.FC<SyncHistoryModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  // 从 Redux store 读取历史记录和登录状态
  const histories = useAppSelector((state) => state.userInfo.histories);
  const isLoggedIn = useAppSelector((state) => state.userInfo.isLoggedIn);
  const isChecking = useAppSelector((state) => state.userInfo.isChecking);
  const isLoadingHistories = useAppSelector((state) => state.userInfo.isLoadingHistories);

  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  // 标记是否是用户主动清空，避免清空后触发自动刷新
  const isClearedByUserRef = useRef(false);
  // 标记是否已经尝试加载过历史记录（即使为空），避免循环请求
  const hasTriedLoadRef = useRef(false);
  // 记录上次加载的时间戳，防止频繁请求
  const lastLoadTimeRef = useRef<number>(0);

  // 检查是否有任何操作正在进行（全局操作锁）- 使用 useMemo 优化性能
  const isAnyOperationInProgress = useMemo(
    () => isSyncing || isRestoring !== null || isDeleting !== null || isExporting || isImporting || isClearing || isRefreshing || isLoadingHistories,
    [isSyncing, isRestoring, isDeleting, isExporting, isImporting, isClearing, isRefreshing, isLoadingHistories]
  );

  // 识别当前记录（使用 configId，从 store 读取历史记录）
  const identifyCurrentRecord = useCallback(() => {
    try {
      const localConfig = getLocalConfig();
      if (!localConfig?.settings.configId) {
        setCurrentHistoryId(null);
        return;
      }

      const matchedHistory = findHistoryByConfigId(histories, localConfig.settings.configId);
      setCurrentHistoryId(matchedHistory?.id || null);
    } catch (err) {
      console.error('[SyncHistoryModal] Failed to identify current record:', err);
      setCurrentHistoryId(null);
    }
  }, [histories]);

  // 从云端拉取历史记录
  const refreshHistory = useCallback(async () => {
    if (!isLoggedIn) {
      return;
    }

    // 防止频繁请求：如果距离上次请求不到2秒，跳过
    const now = Date.now();
    if (now - lastLoadTimeRef.current < 2000) {
      return;
    }

    try {
      dispatch(setLoadingHistories(true));
      lastLoadTimeRef.current = now;
      const token = await getAccessToken();
      const historyData = await loadHistoryFromDriveWithToken(token);
      dispatch(setHistories(historyData?.histories || []));
      hasTriedLoadRef.current = true;
    } catch (err: any) {
      console.error('[SyncHistoryModal] 刷新历史记录失败:', err);
      const errorMessage = err?.message || '';
      if (errorMessage.includes('权限不足') || errorMessage.includes('insufficient')) {
        setError(t('popup.pleaseLoginToUseSync'));
      }
      hasTriedLoadRef.current = true;
    } finally {
      dispatch(setLoadingHistories(false));
    }
  }, [isLoggedIn, dispatch, t]);

  // 当登录状态或历史记录变化时，识别当前记录
  useEffect(() => {
    if (isLoggedIn === true && histories.length > 0) {
      identifyCurrentRecord();
    } else {
      setCurrentHistoryId(null);
    }
  }, [isLoggedIn, histories, identifyCurrentRecord]);

  // 关闭弹窗时重置状态
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsSyncing(false);
      hasTriedLoadRef.current = false;
    }
  }, [isOpen]);

  // 打开弹窗或登录状态变化时，自动加载历史记录
  const prevIsLoggedInRef = useRef<boolean | null>(null);
  const prevIsOpenRef = useRef(false);
  useEffect(() => {
    const prevIsLoggedIn = prevIsLoggedInRef.current;
    const prevIsOpen = prevIsOpenRef.current;
    prevIsLoggedInRef.current = isLoggedIn;
    prevIsOpenRef.current = isOpen;

    // 重置清空标记（如果历史记录不为空，说明已经重新加载了）
    if (histories.length > 0) {
      isClearedByUserRef.current = false;
      hasTriedLoadRef.current = false;
    }

    // 打开弹窗且已登录，但历史记录为空时，自动加载
    const isLoginChanged = prevIsLoggedIn !== true && isLoggedIn === true;
    const isModalJustOpened = !prevIsOpen && isOpen;
    const shouldLoad = isOpen &&
      isLoggedIn === true &&
      histories.length === 0 &&
      !isLoadingHistories &&
      !isClearing &&
      !isClearedByUserRef.current &&
      !hasTriedLoadRef.current &&
      (isLoginChanged || isModalJustOpened);

    if (shouldLoad) {
      refreshHistory();
    }
  }, [isOpen, isLoggedIn, histories.length, isLoadingHistories, isClearing, refreshHistory]);

  // 处理点击外部区域和 ESC 键关闭
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // 延迟添加点击事件监听，避免立即触发
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    document.addEventListener('keydown', handleEscape);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleManualSync = async () => {
    if (isAnyOperationInProgress || !isLoggedIn) {
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const success = await autoSyncConfig();
      if (!success) {
        setError(t('popup.syncFailed'));
      } else {
        // 手动同步成功后，重置全局自动同步定时器并刷新历史记录
        resetAutoSyncTimer();
        await refreshHistory();
      }
    } catch (err: any) {
      setError(err.message || t('popup.syncFailed'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async (historyId: string) => {
    if (isAnyOperationInProgress) {
      return;
    }

    setIsRestoring(historyId);
    setError(null);

    try {
      const success = await restoreFromHistory(historyId);
      if (!success) {
        setError(t('popup.restoreFailed'));
      }
      // restoreFromHistory 已通过 historyBatchManager.commit() 更新了 store，无需刷新
    } catch (err: any) {
      console.error('[SyncHistoryModal] Restore failed:', err);
      setError(err.message || t('popup.restoreFailed'));
    } finally {
      setIsRestoring(null);
    }
  };

  const formatHistoryTime = useCallback((timestamp: number) => {
    const date = dayjs(timestamp);
    const now = dayjs();
    const diffMinutes = now.diff(date, 'minute');
    const diffHours = now.diff(date, 'hour');
    const diffDays = now.diff(date, 'day');

    if (diffMinutes < 1) {
      return t('popup.justNow');
    } else if (diffMinutes < 60) {
      return t('popup.minutesAgo').replace('{count}', diffMinutes.toString());
    } else if (diffHours < 24) {
      return t('popup.hoursAgo').replace('{count}', diffHours.toString());
    } else if (diffDays < 7) {
      return t('popup.daysAgo').replace('{count}', diffDays.toString());
    } else {
      return date.format('YYYY-MM-DD HH:mm');
    }
  }, [t]);

  const handleDelete = async (historyId: string) => {
    if (isAnyOperationInProgress) {
      return;
    }

    if (!confirm(t('popup.confirmDelete'))) {
      return;
    }

    setIsDeleting(historyId);
    setError(null);

    try {
      const success = await deleteSyncHistory(historyId);
      if (success) {
        if (currentHistoryId === historyId) {
          setCurrentHistoryId(null);
        }
        // deleteSyncHistory 已通过 historyBatchManager.commit() 更新了 store，无需刷新
      } else {
        setError(t('popup.deleteFailed'));
      }
    } catch (err: any) {
      console.error('[SyncHistoryModal] Delete failed:', err);
      setError(err.message || t('popup.deleteFailed'));
    } finally {
      setIsDeleting(null);
    }
  };

  const handleExport = async () => {
    if (isAnyOperationInProgress || histories.length === 0) {
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const jsonData = await exportSyncHistory();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minimal-newtab-history-${dayjs().format('YYYY-MM-DD-HH-mm-ss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[SyncHistoryModal] Export failed:', err);
      setError(err.message || t('popup.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isAnyOperationInProgress) {
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const text = await file.text();
      const result = await importSyncHistory(text);

      if (result.failed > 0) {
        setError(t('popup.importPartial').replace('{success}', result.success.toString()).replace('{failed}', result.failed.toString()));
      }
      // importSyncHistory 已通过 historyBatchManager.commit() 或直接 dispatch 更新了 store，无需刷新
    } catch (err: any) {
      console.error('[SyncHistoryModal] Import failed:', err);
      setError(err.message || t('popup.importFailed'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerImport = useCallback(() => {
    if (isAnyOperationInProgress) {
      return;
    }
    fileInputRef.current?.click();
  }, [isAnyOperationInProgress]);

  const handleRefreshHistory = async () => {
    if (isAnyOperationInProgress || !isLoggedIn) {
      return;
    }

    setIsRefreshing(true);
    setError(null);
    hasTriedLoadRef.current = false;

    try {
      await refreshHistory();
    } catch (err: any) {
      console.error('[SyncHistoryModal] 刷新历史记录失败:', err);
      setError(err.message || t('popup.refreshFailed'));
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearAll = async () => {
    if (isAnyOperationInProgress || histories.length === 0) {
      return;
    }

    if (!confirm(t('popup.confirmClearAll'))) {
      return;
    }

    setIsClearing(true);
    setError(null);
    isClearedByUserRef.current = true;

    try {
      const success = await clearAllSyncHistory();
      if (success) {
        setCurrentHistoryId(null);
      } else {
        setError(t('popup.clearAllFailed'));
        isClearedByUserRef.current = false;
      }
    } catch (err: any) {
      console.error('[SyncHistoryModal] Clear all failed:', err);
      setError(err.message || t('popup.clearAllFailed'));
      isClearedByUserRef.current = false;
    } finally {
      setIsClearing(false);
    }
  };


  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div ref={modalRef} className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('popup.syncHistory')}</h2>
          <Button
            variant="primary"
            iconOnly
            onClick={onClose}
            aria-label={t('settings.closeSettings')}
            className={`${styles.closeButton} closeButton`}>
            <svg className={styles.closeIcon} aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Button>
        </div>

        <div className={styles.modalContent}>
          {/* 登录状态检查 */}
          {(isLoggedIn === null || isChecking) && (
            <div className={styles.syncSection}>
              <div className={styles.syncStatus}>
                <span>{t('popup.checkingLoginStatus')}</span>
              </div>
            </div>
          )}

          {isLoggedIn === false && (
            <div className={styles.syncSection}>
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '16px', marginBottom: '12px', fontWeight: '500' }}>
                  {t('popup.pleaseLoginGoogle')}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary, #666)', lineHeight: '1.6' }}>
                  {t('popup.pleaseLoginToUseSync')}
                  <br />
                  {t('popup.loginDriveSync')}
                </div>
              </div>
            </div>
          )}

          {isLoggedIn === true && (
            <>
              <div className={styles.syncSection}>
                <div className={styles.allActionsRow}>
                  <Button
                    variant="primary"
                    iconOnly
                    size="small"
                    onClick={handleRefreshHistory}
                    disabled={isAnyOperationInProgress || !isLoggedIn}
                    title={t('popup.refresh')}
                    loading={isRefreshing}
                    className={`${styles.refreshButton} refreshButton`}
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                      </svg>
                    }
                  />
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleManualSync}
                    disabled={isAnyOperationInProgress || isLoggedIn !== true}
                    title={t('popup.syncNow')}
                    loading={isSyncing}>
                    {isSyncing ? null : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                      </svg>
                    )}
                    {t('popup.syncNow')}
                  </Button>
                  <Button
                    variant="info"
                    size="small"
                    onClick={handleExport}
                    disabled={isAnyOperationInProgress || histories.length === 0}
                    title={t('popup.export')}
                    loading={isExporting}
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    }>
                    {isExporting ? t('popup.exporting') : t('popup.export')}
                  </Button>
                  <Button
                    variant="info"
                    size="small"
                    onClick={triggerImport}
                    disabled={isAnyOperationInProgress}
                    title={t('popup.import')}
                    loading={isImporting}
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    }>
                    {isImporting ? t('popup.importing') : t('popup.import')}
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={handleClearAll}
                    disabled={isAnyOperationInProgress || histories.length === 0}
                    title={t('popup.clearAll')}
                    loading={isClearing}
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    }>
                    {isClearing ? t('popup.clearing') : t('popup.clearAll')}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={handleImport}
                  />
                </div>
                {error && <div className={styles.error}>{error}</div>}
              </div>

              <div className={styles.historySection}>
                {histories.length === 0 ? (
                  <div className={styles.emptyHistory}>{t('popup.noHistory')}</div>
                ) : (
                  <div className={styles.historyList}>
                    {histories.slice(0, 4).map((history) => {
                      const isCurrent = currentHistoryId === history.id;
                      return (
                        <div
                          key={history.id}
                          className={`${styles.historyItem} ${
                            isCurrent ? styles.historyItemCurrent : ''
                          }`}>
                          <div className={styles.historyInfo}>
                            <div className={styles.historyType}>
                              {dayjs(history.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                              {isCurrent && (
                                <span className={styles.currentBadge}> {t('popup.current')}</span>
                              )}
                            </div>
                            <div className={styles.historyTime}>
                              {formatHistoryTime(history.updatedAt)}
                            </div>
                          </div>
                          {!isCurrent && (
                            <div className={styles.historyActions}>
                              <Button
                                variant="primary"
                                size="small"
                                onClick={() => handleRestore(history.id)}
                                disabled={isAnyOperationInProgress}
                                title={t('popup.restore')}
                                loading={isRestoring === history.id}
                                icon={
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                                    <path d="M21 3v5h-5"></path>
                                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                                    <path d="M3 21v-5h5"></path>
                                  </svg>
                                }>
                                {isRestoring === history.id ? t('popup.restoring') : t('popup.restore')}
                              </Button>
                              <Button
                                variant="danger"
                                size="small"
                                onClick={() => handleDelete(history.id)}
                                disabled={isAnyOperationInProgress}
                                title={t('popup.delete')}
                                loading={isDeleting === history.id}
                                icon={
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                  </svg>
                                }>
                                {isDeleting === history.id ? t('popup.deleting') : t('popup.delete')}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default SyncHistoryModal;
