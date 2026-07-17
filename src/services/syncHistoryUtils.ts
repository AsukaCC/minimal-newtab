import type {
  SyncConfigParsed,
  SyncHistory,
} from './chromeSyncService';

export function upsertSyncHistory(
  histories: SyncHistory[],
  config: SyncConfigParsed,
  type: SyncHistory['type'],
  maxHistoryCount: number,
  createHistoryId = () =>
    `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
): SyncHistory[] {
  const configId = config.settings.configId;
  const existingIndex = configId
    ? histories.findIndex(
        (history) => history.settings.configId === configId,
      )
    : -1;
  const existing = existingIndex >= 0 ? histories[existingIndex] : null;
  const nextHistory: SyncHistory = {
    id: existing?.id || createHistoryId(),
    updatedAt: config.updatedAt,
    settings: config.settings,
    type,
    deviceId: config.deviceId,
  };
  const remaining = existingIndex >= 0
    ? histories.filter((_, index) => index !== existingIndex)
    : histories;
  return [nextHistory, ...remaining].slice(0, maxHistoryCount);
}
