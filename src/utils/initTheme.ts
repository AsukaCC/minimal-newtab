/**
 * 同步初始化主题 - 在 React 渲染前执行
 * 避免主题闪烁
 */
export function initTheme(): void {
  try {
    // 检测系统主题偏好
    const getSystemTheme = (): 'light' | 'dark' => {
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      return 'light'; // 降级方案
    };

    // 先设置系统主题作为默认值
    const systemTheme = getSystemTheme();
    document.documentElement.setAttribute('data-theme', systemTheme);

    // 从 localStorage 读取实际配置并更新（如果用户之前设置过主题）
    try {
      const cachedTheme = localStorage.getItem('theme');
      if (cachedTheme !== null) {
        const parsedTheme = JSON.parse(cachedTheme);
        const isDarkMode = typeof parsedTheme === 'boolean' 
          ? parsedTheme 
          : parsedTheme === 'true' || parsedTheme === true;
        document.documentElement.setAttribute(
          'data-theme',
          isDarkMode ? 'dark' : 'light'
        );
      }
      // 如果没有存储的主题配置，保持系统主题
    } catch (e) {
      // localStorage 不可用，保持系统主题
    }
  } catch (error) {
    console.error('Error initializing theme:', error);
    // 设置默认主题
    document.documentElement.setAttribute('data-theme', 'light');
  }
}
