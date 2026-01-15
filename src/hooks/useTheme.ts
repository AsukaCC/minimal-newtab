import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setTheme } from '../store/configSlice';

export const useTheme = () => {
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.config.theme);

  useEffect(() => {
    // 主题变化时同步更新 document
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    // 调试：确认主题已更新
    console.log('[useTheme] Theme updated:', theme, 'isDarkMode:', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    dispatch(setTheme(!isDarkMode));
  };

  return {
    isDarkMode,
    toggleTheme,
    loading: false, // Redux 状态是同步的，不需要 loading 状态
  };
};
