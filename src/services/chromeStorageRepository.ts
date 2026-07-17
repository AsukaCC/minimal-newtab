import type {
  ChromeSyncData,
  SyncConfigStorage,
  SyncHistory,
} from './chromeSyncService';

export const LEGACY_SYNC_DATA_KEY = 'syncData';
export const SYNC_CONFIG_META_KEY = 'syncConfigMeta';
export const SYNC_CONFIG_CHUNK_PREFIX = 'syncConfigChunk:';
export const LOCAL_HISTORY_KEY = 'syncHistories';
export const LOCAL_DEVICE_IDENTITY_KEY = 'syncDeviceIdentity';
export const SYNC_STORAGE_FORMAT_VERSION = 2;

const DEFAULT_QUOTA_BYTES = 102400;
const DEFAULT_QUOTA_BYTES_PER_ITEM = 8192;
const CHUNK_TARGET_BYTES = 7800;

interface SyncConfigMeta {
  version: number;
  chunkCount: number;
  updatedAt: number;
  savedAt: number;
}

export interface SyncStorageDiagnostics {
  available: boolean;
  bytesInUse: number;
  quotaBytes: number;
  quotaBytesPerItem: number;
  configChunkCount: number;
  error?: string;
}

export interface DeviceSyncIdentity {
  deviceId: string;
  configId: string;
  createdAt: number;
  hasSynced: boolean;
}

let deviceIdentityPromise: Promise<DeviceSyncIdentity> | null = null;

function createIdentityToken(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function isDeviceSyncIdentity(value: unknown): value is DeviceSyncIdentity {
  if (!value || typeof value !== 'object') return false;
  const identity = value as Partial<DeviceSyncIdentity>;
  return Boolean(
    identity.deviceId &&
    identity.configId &&
    typeof identity.createdAt === 'number' &&
    typeof identity.hasSynced === 'boolean',
  );
}

function getStorageArea(area: 'sync' | 'local'): chrome.storage.StorageArea {
  if (typeof chrome === 'undefined' || !chrome.storage?.[area]) {
    throw new Error(`chrome.storage.${area} is unavailable`);
  }
  return chrome.storage[area];
}

function storageGet<T>(
  area: 'sync' | 'local',
  keys: string | string[] | null,
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      getStorageArea(area).get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result as T);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function storageSet(
  area: 'sync' | 'local',
  values: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      getStorageArea(area).set(values, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function getDeviceSyncIdentity(): Promise<DeviceSyncIdentity> {
  if (deviceIdentityPromise) return deviceIdentityPromise;
  deviceIdentityPromise = (async () => {
    const result = await storageGet<Record<string, unknown>>(
      'local',
      LOCAL_DEVICE_IDENTITY_KEY,
    );
    const existing = result[LOCAL_DEVICE_IDENTITY_KEY];
    if (isDeviceSyncIdentity(existing)) return existing;

    const token = createIdentityToken();
    const identity: DeviceSyncIdentity = {
      deviceId: `device-${token}`,
      configId: `config-device-${token}`,
      createdAt: Date.now(),
      hasSynced: false,
    };
    await storageSet('local', { [LOCAL_DEVICE_IDENTITY_KEY]: identity });
    return identity;
  })();

  try {
    return await deviceIdentityPromise;
  } catch (error) {
    deviceIdentityPromise = null;
    throw error;
  }
}

export async function markDeviceConfigSynced(): Promise<DeviceSyncIdentity> {
  const identity = await getDeviceSyncIdentity();
  if (identity.hasSynced) return identity;
  const updated = { ...identity, hasSynced: true };
  await storageSet('local', { [LOCAL_DEVICE_IDENTITY_KEY]: updated });
  deviceIdentityPromise = Promise.resolve(updated);
  return updated;
}

function storageRemove(
  area: 'sync' | 'local',
  keys: string | string[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      getStorageArea(area).remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

function getBytesInUse(
  area: 'sync' | 'local',
  keys: string | string[] | null,
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      getStorageArea(area).getBytesInUse(keys, (bytesInUse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(bytesInUse);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function measureStorageItem(key: string, value: unknown): number {
  return new TextEncoder().encode(key).length +
    new TextEncoder().encode(JSON.stringify(value)).length;
}

export function splitSerializedConfig(
  serialized: string,
  maxItemBytes = CHUNK_TARGET_BYTES,
): string[] {
  const chunks: string[] = [];
  let current = '';

  for (const character of serialized) {
    const candidate = current + character;
    const key = `${SYNC_CONFIG_CHUNK_PREFIX}${chunks.length}`;
    if (current && measureStorageItem(key, candidate) > maxItemBytes) {
      chunks.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  if (current || chunks.length === 0) chunks.push(current);
  return chunks;
}

function getQuotaBytes(): number {
  return typeof chrome !== 'undefined' && chrome.storage?.sync?.QUOTA_BYTES
    ? chrome.storage.sync.QUOTA_BYTES
    : DEFAULT_QUOTA_BYTES;
}

function getQuotaBytesPerItem(): number {
  return typeof chrome !== 'undefined' && chrome.storage?.sync?.QUOTA_BYTES_PER_ITEM
    ? chrome.storage.sync.QUOTA_BYTES_PER_ITEM
    : DEFAULT_QUOTA_BYTES_PER_ITEM;
}

async function readConfigMeta(): Promise<SyncConfigMeta | null> {
  const result = await storageGet<Record<string, SyncConfigMeta>>(
    'sync',
    SYNC_CONFIG_META_KEY,
  );
  const meta = result[SYNC_CONFIG_META_KEY];
  return meta?.version === SYNC_STORAGE_FORMAT_VERSION ? meta : null;
}

async function readSyncedConfigDirect(): Promise<SyncConfigStorage | null> {
  const meta = await readConfigMeta();
  if (!meta || meta.chunkCount < 1) return null;

  const keys = Array.from(
    { length: meta.chunkCount },
    (_, index) => `${SYNC_CONFIG_CHUNK_PREFIX}${index}`,
  );
  const result = await storageGet<Record<string, string>>('sync', keys);
  const serialized = keys.map((key) => result[key]).join('');
  if (!serialized || keys.some((key) => typeof result[key] !== 'string')) {
    throw new Error('同步配置分块不完整，请重新同步');
  }

  return JSON.parse(serialized) as SyncConfigStorage;
}

export async function writeSyncedConfig(
  config: SyncConfigStorage,
): Promise<void> {
  const serialized = JSON.stringify(config);
  const chunks = splitSerializedConfig(serialized);
  const quotaBytes = getQuotaBytes();
  const quotaBytesPerItem = getQuotaBytesPerItem();
  const previousMeta = await readConfigMeta();
  const meta: SyncConfigMeta = {
    version: SYNC_STORAGE_FORMAT_VERSION,
    chunkCount: chunks.length,
    updatedAt: config.updatedAt,
    savedAt: Date.now(),
  };
  const values: Record<string, unknown> = {
    [SYNC_CONFIG_META_KEY]: meta,
  };

  chunks.forEach((chunk, index) => {
    values[`${SYNC_CONFIG_CHUNK_PREFIX}${index}`] = chunk;
  });

  for (const [key, value] of Object.entries(values)) {
    const bytes = measureStorageItem(key, value);
    if (bytes > quotaBytesPerItem) {
      throw new Error(`同步配置分块 ${key} 超过 ${quotaBytesPerItem} 字节限制`);
    }
  }

  const totalBytes = Object.entries(values).reduce(
    (total, [key, value]) => total + measureStorageItem(key, value),
    0,
  );
  if (totalBytes > quotaBytes) {
    throw new Error(`同步配置超过 ${quotaBytes} 字节总容量限制`);
  }

  const existingValues = await storageGet<Record<string, unknown>>('sync', null);
  const unrelatedBytes = Object.entries(existingValues)
    .filter(
      ([key]) =>
        key !== SYNC_CONFIG_META_KEY &&
        !key.startsWith(SYNC_CONFIG_CHUNK_PREFIX),
    )
    .reduce(
      (total, [key, value]) => total + measureStorageItem(key, value),
      0,
    );
  if (unrelatedBytes + totalBytes > quotaBytes) {
    throw new Error(
      `同步存储空间不足：需要 ${totalBytes} 字节，可用 ${quotaBytes - unrelatedBytes} 字节`,
    );
  }

  await storageSet('sync', values);

  if (previousMeta && previousMeta.chunkCount > chunks.length) {
    const staleKeys = Array.from(
      { length: previousMeta.chunkCount - chunks.length },
      (_, index) => `${SYNC_CONFIG_CHUNK_PREFIX}${chunks.length + index}`,
    );
    await storageRemove('sync', staleKeys);
  }
}

export async function clearSyncedConfig(): Promise<void> {
  const all = await storageGet<Record<string, unknown>>('sync', null);
  const keys = Object.keys(all).filter(
    (key) => key === SYNC_CONFIG_META_KEY || key.startsWith(SYNC_CONFIG_CHUNK_PREFIX),
  );
  if (keys.length > 0) await storageRemove('sync', keys);
}

export async function readLocalHistories(): Promise<SyncHistory[]> {
  const result = await storageGet<Record<string, SyncHistory[]>>(
    'local',
    LOCAL_HISTORY_KEY,
  );
  return Array.isArray(result[LOCAL_HISTORY_KEY])
    ? result[LOCAL_HISTORY_KEY]
    : [];
}

export async function writeLocalHistories(
  histories: SyncHistory[],
): Promise<void> {
  await storageSet('local', { [LOCAL_HISTORY_KEY]: histories });
}

function mergeHistories(
  localHistories: SyncHistory[],
  legacyHistories: SyncHistory[],
): SyncHistory[] {
  const merged = new Map<string, SyncHistory>();
  for (const history of [...localHistories, ...legacyHistories]) {
    const key = history.settings.configId || history.id;
    const existing = merged.get(key);
    if (!existing || history.updatedAt > existing.updatedAt) merged.set(key, history);
  }
  return Array.from(merged.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

let migrationPromise: Promise<void> | null = null;

export async function migrateLegacySyncData(
  maxHistoryCount: number,
): Promise<void> {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    const legacyResult = await storageGet<Record<string, ChromeSyncData>>(
      'sync',
      LEGACY_SYNC_DATA_KEY,
    );
    const legacy = legacyResult[LEGACY_SYNC_DATA_KEY];
    if (!legacy) return;

    const currentConfig = await readSyncedConfigDirect();
    if (!currentConfig && legacy.currentConfig) {
      await writeSyncedConfig(legacy.currentConfig);
    }

    const localHistories = await readLocalHistories();
    const histories = mergeHistories(
      localHistories,
      legacy.histories || [],
    ).slice(0, maxHistoryCount);
    await writeLocalHistories(histories);
    await storageRemove('sync', LEGACY_SYNC_DATA_KEY);
  })();

  try {
    await migrationPromise;
  } finally {
    migrationPromise = null;
  }
}

export async function readSyncData(
  maxHistoryCount: number,
): Promise<ChromeSyncData> {
  await migrateLegacySyncData(maxHistoryCount);
  const [currentConfig, histories, meta] = await Promise.all([
    readSyncedConfigDirect(),
    readLocalHistories(),
    readConfigMeta(),
  ]);
  return {
    currentConfig,
    histories: histories.slice(0, maxHistoryCount),
    lastSyncAt: meta?.savedAt || 0,
  };
}

export async function getSyncStorageDiagnostics(): Promise<SyncStorageDiagnostics> {
  const quotaBytes = getQuotaBytes();
  const quotaBytesPerItem = getQuotaBytesPerItem();
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.sync) {
      throw new Error('chrome.storage.sync is unavailable');
    }
    const [bytesInUse, meta] = await Promise.all([
      getBytesInUse('sync', null),
      readConfigMeta(),
    ]);
    return {
      available: true,
      bytesInUse,
      quotaBytes,
      quotaBytesPerItem,
      configChunkCount: meta?.chunkCount || 0,
    };
  } catch (error) {
    return {
      available: false,
      bytesInUse: 0,
      quotaBytes,
      quotaBytesPerItem,
      configChunkCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function isSyncedConfigChange(
  changes: Record<string, chrome.storage.StorageChange>,
): boolean {
  return Object.keys(changes).some(
    (key) =>
      key === LEGACY_SYNC_DATA_KEY ||
      key === SYNC_CONFIG_META_KEY ||
      key.startsWith(SYNC_CONFIG_CHUNK_PREFIX),
  );
}
