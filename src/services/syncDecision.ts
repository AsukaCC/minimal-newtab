export type ConfigSyncDecision =
  | 'upload-local'
  | 'download-cloud'
  | 'record-cloud';

export interface ConfigSyncDecisionInput {
  hasCloudConfig: boolean;
  contentIsSame: boolean;
  localUpdatedAt: number;
  cloudUpdatedAt: number;
  cloudDeviceId?: string;
  currentDeviceId: string;
  hasCurrentDeviceHistory: boolean;
}

export function decideConfigSync(
  input: ConfigSyncDecisionInput,
): ConfigSyncDecision {
  if (!input.hasCloudConfig) return 'upload-local';

  if (!input.contentIsSame) {
    return input.localUpdatedAt > input.cloudUpdatedAt
      ? 'upload-local'
      : 'download-cloud';
  }

  const cloudBelongsToCurrentDevice =
    input.cloudDeviceId === input.currentDeviceId;
  if (cloudBelongsToCurrentDevice) return 'record-cloud';

  // A cleared or brand-new device has no local record. Re-uploading the same
  // content creates its stable per-device record without generating a new ID.
  return input.hasCurrentDeviceHistory ? 'record-cloud' : 'upload-local';
}
