import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setTheme } from '../store';

export const useTheme = () => {
  const dispatch = useAppDispatch();
  const themeValue = useAppSelector((state) => state.config.theme);
  
  // 确保 isDarkMode 始终是布尔值（防止字符串 "true"/"false"）
  const isDarkMode = typeof themeValue === 'boolean' 
    ? themeValue 
    : themeValue === 'true' || themeValue === true;

  useEffect(() => {
    // 主题变化时同步更新 document
    const theme = isDarkMode ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [isDarkMode, themeValue]);

  const toggleTheme = () => {
    dispatch(setTheme(!isDarkMode));
  };

  return {
    isDarkMode,
    toggleTheme,
    loading: false, // Redux 状态是同步的，不需要 loading 状态
  };
};
