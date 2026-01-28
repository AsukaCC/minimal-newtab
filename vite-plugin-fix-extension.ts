import type { Plugin } from 'vite';
import {
  copyFileSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function fixExtension(): Plugin {
  return {
    name: 'fix-extension',
    writeBundle() {
      // 构建完成后修复扩展文件
      const distDir = join(__dirname, 'dist');
      const manifestSrc = join(__dirname, 'src/manifest.json');
      const manifestDest = join(distDir, 'manifest.json');
      const popupHtmlSrc = join(distDir, 'src/popup.html');
      const popupHtmlDest = join(distDir, 'popup.html');
      const srcDir = join(distDir, 'src');

      // 复制 manifest.json
      try {
        mkdirSync(distDir, { recursive: true });
        copyFileSync(manifestSrc, manifestDest);
        console.log('✓ manifest.json copied to dist');
      } catch (error) {
        console.error('Error copying manifest.json:', error);
      }

      // 移动并修复 popup.html
      if (existsSync(popupHtmlSrc)) {
        try {
          let content = readFileSync(popupHtmlSrc, 'utf-8');
          // 修复资源路径：将 /assets/ 改为 ./assets/
          content = content.replace(/href="\/assets\//g, 'href="./assets/');
          content = content.replace(/src="\/assets\//g, 'src="./assets/');

          writeFileSync(popupHtmlDest, content);
          console.log('✓ popup.html moved and fixed');
        } catch (error) {
          console.error('Error fixing popup.html:', error);
        }
      }

      // 移动并修复 newtab.html
      const newtabHtmlSrc = join(distDir, 'src/newtab.html');
      const newtabHtmlDest = join(distDir, 'newtab.html');
      if (existsSync(newtabHtmlSrc)) {
        try {
          let content = readFileSync(newtabHtmlSrc, 'utf-8');
          // 修复资源路径：将 /assets/ 改为 ./assets/
          content = content.replace(/href="\/assets\//g, 'href="./assets/');
          content = content.replace(/src="\/assets\//g, 'src="./assets/');

          writeFileSync(newtabHtmlDest, content);
          console.log('✓ newtab.html moved and fixed');
        } catch (error) {
          console.error('Error fixing newtab.html:', error);
        }
      } else {
        console.warn('⚠ newtab.html not found in dist/src/, skipping...');
      }

      // 删除 src 目录（确保所有文件都已处理）
      try {
        if (existsSync(srcDir)) {
          rmSync(srcDir, { recursive: true, force: true });
        }
      } catch (e) {
        console.warn('⚠ Could not remove src directory:', e);
      }
    },
  };
}
