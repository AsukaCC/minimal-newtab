import { spawn } from 'child_process';

console.log('🚀 Development mode started');
console.log('📦 Watching for file changes...');
console.log('💡 Load the extension from the "dist" folder in Chrome');
console.log('');

// 启动 Vite watch 模式（插件会自动处理修复）
const viteProcess = spawn(
  'vite',
  ['build', '--watch', '--mode', 'development'],
  {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  }
);

// 处理退出
process.on('SIGINT', () => {
  viteProcess.kill();
  process.exit();
});
