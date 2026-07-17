import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const distDir = resolve('dist');
const manifestPath = resolve(distDir, 'manifest.json');

if (!existsSync(manifestPath)) {
  throw new Error('dist/manifest.json does not exist. Run the build first.');
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const errors = [];

if (manifest.manifest_version !== 3) {
  errors.push('manifest_version must be 3');
}
if (!manifest.action || manifest.browser_action || manifest.page_action) {
  errors.push('use action instead of browser_action/page_action');
}
if (!manifest.background?.service_worker || manifest.background?.scripts) {
  errors.push('background must declare a service_worker and no scripts array');
}
if (manifest.background?.persistent !== undefined) {
  errors.push('background.persistent is not valid in Manifest V3');
}
if (manifest.background?.type !== 'module') {
  errors.push('background service worker must use module type');
}
if ('key' in manifest && (!manifest.key || manifest.key === 'undefined')) {
  errors.push('key must be omitted unless a real extension key is configured');
}
if (manifest.key) {
  try {
    const digest = createHash('sha256')
      .update(Buffer.from(manifest.key, 'base64'))
      .digest('hex')
      .slice(0, 32);
    const extensionId = Array.from(digest, (character) =>
      String.fromCharCode(97 + Number.parseInt(character, 16))
    ).join('');
    if (extensionId !== 'geleojmmkfddmlgenkjdkdlngplihgnj') {
      errors.push(`extension key resolves to unexpected ID: ${extensionId}`);
    }
  } catch {
    errors.push('key must be a valid Base64-encoded extension public key');
  }
}

const hostPermissions = new Set(manifest.host_permissions ?? []);
for (const requiredHost of [
  'https://www.google.com/*',
  'https://api.bing.com/*',
]) {
  if (!hostPermissions.has(requiredHost)) {
    errors.push(`required host permission is missing: ${requiredHost}`);
  }
}

const referencedFiles = [
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  manifest.chrome_url_overrides?.newtab,
  ...Object.values(manifest.icons ?? {}),
].filter(Boolean);

for (const file of referencedFiles) {
  if (!existsSync(resolve(distDir, file))) {
    errors.push(`referenced file is missing: ${file}`);
  }
}

if (errors.length > 0) {
  throw new Error(`Manifest V3 validation failed:\n- ${errors.join('\n- ')}`);
}

console.log('Manifest V3 validation passed');
