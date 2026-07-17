import assert from 'node:assert/strict';
import {
  LEGACY_SYNC_DATA_KEY,
  LOCAL_DEVICE_IDENTITY_KEY,
  LOCAL_HISTORY_KEY,
  SYNC_CONFIG_CHUNK_PREFIX,
  SYNC_CONFIG_META_KEY,
  getSyncStorageDiagnostics,
  getDeviceSyncIdentity,
  markDeviceConfigSynced,
  measureStorageItem,
  readSyncData,
  writeSyncedConfig,
} from '../src/services/chromeStorageRepository.ts';
import type {
  ChromeSyncData,
  SyncConfigStorage,
  SyncHistory,
} from '../src/services/chromeSyncService';
import type { ConfigState } from '../src/store';
import { upsertSyncHistory } from '../src/services/syncHistoryUtils.ts';
import { decideConfigSync } from '../src/services/syncDecision.ts';

type StorageValues = Record<string, unknown>;

function createStorageArea(values: StorageValues) {
  const select = (keys: string | string[] | null): StorageValues => {
    if (keys === null) return { ...values };
    const selected = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(
      selected.filter((key) => key in values).map((key) => [key, values[key]]),
    );
  };

  return {
    get(keys: string | string[] | null, callback: (items: StorageValues) => void) {
      callback(select(keys));
    },
    set(items: StorageValues, callback: () => void) {
      Object.assign(values, items);
      callback();
    },
    remove(keys: string | string[], callback: () => void) {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key];
      callback();
    },
    getBytesInUse(
      keys: string | string[] | null,
      callback: (bytesInUse: number) => void,
    ) {
      const bytes = Object.entries(select(keys)).reduce(
        (total, [key, value]) => total + measureStorageItem(key, value),
        0,
      );
      callback(bytes);
    },
  };
}

function makeConfig(navItemCount = 5): ConfigState {
  return {
    configId: 'config-test',
    theme: false,
    updatedAt: '2026-07-17 10:00:00',
    chooseEngine: 'default',
    isDirectLink: false,
    themeColor: '#667eea',
    language: 'zh-CN',
    navItems: Array.from({ length: navItemCount }, (_, index) => ({
      id: `site-${index}`,
      label: `Workspace ${index}`,
      url: `https://example.com/workspaces/${index}?view=dashboard`,
      iconUrl: `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(
        `https://example.com/workspaces/${index}`,
      )}&sz=64`,
    })),
    showNavBar: true,
    navBarItemGap: 2,
    navBarIconSize: 32,
  };
}

const syncValues: StorageValues = {};
const localValues: StorageValues = {};
const legacyConfig: SyncConfigStorage = {
  updatedAt: 1784253600000,
  settings: makeConfig(),
};
const legacyHistories: SyncHistory[] = Array.from({ length: 12 }, (_, index) => ({
  id: `history-${index}`,
  updatedAt: legacyConfig.updatedAt - index,
  settings: { ...legacyConfig.settings, configId: `config-${index}` },
  type: 'upload',
}));
const legacyData: ChromeSyncData = {
  currentConfig: legacyConfig,
  histories: legacyHistories,
  lastSyncAt: legacyConfig.updatedAt,
};
syncValues[LEGACY_SYNC_DATA_KEY] = legacyData;

(globalThis as typeof globalThis & { chrome: unknown }).chrome = {
  runtime: {},
  storage: {
    sync: {
      ...createStorageArea(syncValues),
      QUOTA_BYTES: 102400,
      QUOTA_BYTES_PER_ITEM: 8192,
    },
    local: createStorageArea(localValues),
  },
};

const initialDeviceIdentity = await getDeviceSyncIdentity();
const repeatedDeviceIdentity = await getDeviceSyncIdentity();
assert.deepEqual(repeatedDeviceIdentity, initialDeviceIdentity);
assert.equal(initialDeviceIdentity.hasSynced, false);
assert.equal(
  (localValues[LOCAL_DEVICE_IDENTITY_KEY] as { configId: string }).configId,
  initialDeviceIdentity.configId,
);
const syncedDeviceIdentity = await markDeviceConfigSynced();
assert.equal(syncedDeviceIdentity.hasSynced, true);
assert.equal(syncedDeviceIdentity.configId, initialDeviceIdentity.configId);

const firstDeviceConfig: SyncConfigStorage = {
  deviceId: initialDeviceIdentity.deviceId,
  updatedAt: 100,
  settings: {
    ...makeConfig(1),
    configId: initialDeviceIdentity.configId,
  },
};
const initialDeviceHistories = upsertSyncHistory(
  [],
  firstDeviceConfig,
  'upload',
  10,
  () => 'history-device-a',
);
const updatedDeviceHistories = upsertSyncHistory(
  initialDeviceHistories,
  { ...firstDeviceConfig, updatedAt: 200 },
  'upload',
  10,
  () => 'should-not-be-used',
);
assert.equal(updatedDeviceHistories.length, 1);
assert.equal(updatedDeviceHistories[0].id, 'history-device-a');
assert.equal(updatedDeviceHistories[0].updatedAt, 200);

const otherDeviceHistories = upsertSyncHistory(
  updatedDeviceHistories,
  {
    deviceId: 'device-b',
    updatedAt: 300,
    settings: { ...makeConfig(1), configId: 'config-device-b' },
  },
  'download',
  10,
  () => 'history-device-b',
);
assert.equal(otherDeviceHistories.length, 2);
assert.equal(otherDeviceHistories[0].id, 'history-device-b');

const recreateAfterClearDecision = decideConfigSync({
  hasCloudConfig: true,
  contentIsSame: true,
  localUpdatedAt: 300,
  cloudUpdatedAt: 300,
  cloudDeviceId: initialDeviceIdentity.deviceId,
  currentDeviceId: initialDeviceIdentity.deviceId,
  hasCurrentDeviceHistory: false,
});
assert.equal(recreateAfterClearDecision, 'record-cloud');
const recreatedAfterClear = upsertSyncHistory(
  [],
  firstDeviceConfig,
  'download',
  10,
  () => 'history-recreated-after-clear',
);
assert.equal(recreatedAfterClear.length, 1);

assert.equal(
  decideConfigSync({
    hasCloudConfig: true,
    contentIsSame: true,
    localUpdatedAt: 300,
    cloudUpdatedAt: 300,
    cloudDeviceId: 'device-b',
    currentDeviceId: initialDeviceIdentity.deviceId,
    hasCurrentDeviceHistory: false,
  }),
  'upload-local',
);
assert.equal(
  decideConfigSync({
    hasCloudConfig: true,
    contentIsSame: false,
    localUpdatedAt: 400,
    cloudUpdatedAt: 300,
    currentDeviceId: initialDeviceIdentity.deviceId,
    hasCurrentDeviceHistory: true,
  }),
  'upload-local',
);
assert.equal(
  decideConfigSync({
    hasCloudConfig: true,
    contentIsSame: false,
    localUpdatedAt: 200,
    cloudUpdatedAt: 300,
    currentDeviceId: initialDeviceIdentity.deviceId,
    hasCurrentDeviceHistory: true,
  }),
  'download-cloud',
);

const migrated = await readSyncData(10);
assert.deepEqual(migrated.currentConfig, legacyConfig);
assert.equal(migrated.histories.length, 10);
assert.equal(syncValues[LEGACY_SYNC_DATA_KEY], undefined);
assert.equal((localValues[LOCAL_HISTORY_KEY] as SyncHistory[]).length, 10);
assert.ok(syncValues[SYNC_CONFIG_META_KEY]);

const largeConfig: SyncConfigStorage = {
  updatedAt: 1784257200000,
  settings: makeConfig(200),
};
await writeSyncedConfig(largeConfig);

const restored = await readSyncData(10);
assert.deepEqual(restored.currentConfig, largeConfig);

const chunkEntries = Object.entries(syncValues).filter(([key]) =>
  key.startsWith(SYNC_CONFIG_CHUNK_PREFIX),
);
assert.ok(chunkEntries.length > 1);
for (const [key, value] of chunkEntries) {
  assert.ok(measureStorageItem(key, value) <= 8192, `${key} exceeds item quota`);
}

const diagnostics = await getSyncStorageDiagnostics();
assert.equal(diagnostics.available, true);
assert.equal(diagnostics.configChunkCount, chunkEntries.length);
assert.ok(diagnostics.bytesInUse > 0 && diagnostics.bytesInUse < 102400);

const customSiteSvg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
const customSiteConfig: SyncConfigStorage = {
  updatedAt: 1784258000000,
  settings: {
    ...makeConfig(1),
    navItems: [
      {
        id: 'custom-synced-site',
        label: 'Synced custom site',
        url: 'https://custom.example.com',
        customIconSvg: customSiteSvg,
      },
    ],
  },
};
await writeSyncedConfig(customSiteConfig);
const restoredCustomSiteConfig = await readSyncData(10);
assert.deepEqual(restoredCustomSiteConfig.currentConfig, customSiteConfig);
assert.equal(
  restoredCustomSiteConfig.currentConfig?.settings.navItems?.[0].customIconSvg,
  customSiteSvg,
  'custom SVG icon was not included in account sync data',
);

await writeSyncedConfig(legacyConfig);
const remainingChunkKeys = Object.keys(syncValues).filter((key) =>
  key.startsWith(SYNC_CONFIG_CHUNK_PREFIX),
);
assert.equal(remainingChunkKeys.length, 1, 'stale chunks were not removed');

console.log('Chrome sync storage tests passed', {
  migratedHistoryCount: migrated.histories.length,
  configChunkCount: chunkEntries.length,
  bytesInUse: diagnostics.bytesInUse,
  customSvgSynced: true,
  stableDeviceConfigId: syncedDeviceIdentity.configId,
  sameDeviceHistoryCount: updatedDeviceHistories.length,
  multiDeviceHistoryCount: otherDeviceHistories.length,
  recreatedAfterClear: recreatedAfterClear.length === 1,
});
