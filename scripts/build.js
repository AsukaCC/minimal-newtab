import { spawn } from 'child_process';

console.log('🏗️  Building for production...');
console.log('');

// 启动 Vite build
const viteProcess = spawn('vite', ['build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'production',
  },
});

// 处理退出
viteProcess.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  viteProcess.kill();
  process.exit();
});
