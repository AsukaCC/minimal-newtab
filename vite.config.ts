import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fixExtension } from './vite-plugin-fix-extension';

export default defineConfig(({ mode }) => {
  // 检查是否为开发模式（通过 mode）
  const isDev =
    mode === 'development' || process.env.NODE_ENV === 'development';

  return {
    plugins: [react(), fixExtension()],
    css: {
      modules: {
        // CSS Modules 类名生成规则
        generateScopedName: '[name]__[local]___[hash:base64:5]',
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      minify: !isDev, // 开发模式不压缩，生产模式压缩
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup.html'),
          newtab: resolve(__dirname, 'src/newtab.html'),
          background: resolve(__dirname, 'src/background.ts'),
          content: resolve(__dirname, 'src/content.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            return chunkInfo.name === 'background' ||
              chunkInfo.name === 'content'
              ? '[name].js'
              : 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'popup.html') {
              return '[name][extname]';
            }
            return 'assets/[name]-[hash].[ext]';
          },
        },
      },
    },
  };
});
