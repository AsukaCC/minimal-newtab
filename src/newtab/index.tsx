import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import '../style.css';
import { store, persistor } from '../store';
import ThemeButton from '../components/ThemeButton';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setHistories, setLoadingHistories } from '../store';
import { getSyncHistory, startAutoSync, stopAutoSync } from '../services/chromeSyncService';
import styles from './index.module.css';
import Search from '../components/Search';
import Loading from '../components/Loading';
import ConfigInfo, { ConfigInfoButton } from '../components/ConfigInfo';
import BottomNavBar from '../components/BottomNavBar';

const NewTabApp: React.FC = () => {
  const { t } = useI18n();
  const { isDarkMode, toggleTheme } = useTheme();
  const themeColor = useAppSelector((state) => state.config.themeColor);
  const dispatch = useAppDispatch();
  const [isConfigInfoOpen, setIsConfigInfoOpen] = useState(false);

  useEffect(() => {
    document.title = t('extensionName');
  }, [t]);

  // 应用初始化时从本地存储加载历史记录
  useEffect(() => {
    const loadHistory = async () => {
      try {
        dispatch(setLoadingHistories(true));
        await getSyncHistory(true);
      } catch (error) {
        console.error('[NewTabApp] 加载历史记录失败:', error);
        dispatch(setHistories([]));
      } finally {
        dispatch(setLoadingHistories(false));
      }
    };

    loadHistory();
  }, [dispatch]);

  // 启动全局自动同步定时器（Chrome 同步始终工作）
  useEffect(() => {
    // 启动自动同步
    startAutoSync();

    // 组件卸载时清理定时器
    return () => {
      stopAutoSync();
    };
  }, []);

  // 应用主题色
  useEffect(() => {
    if (themeColor) {
      document.documentElement.style.setProperty('--color-primary', themeColor);
    }
  }, [themeColor]);

  const handleOpenConfigInfo = () => {
    setIsConfigInfoOpen(true);
  };

  const handleCloseConfigInfo = () => {
    setIsConfigInfoOpen(false);
  };

  return (
    <div className={`${styles.newtabPage} ${styles.container}`}>
      <div className={styles.tools}>
        <ThemeButton isDarkMode={isDarkMode} onChange={toggleTheme} />
        <ConfigInfoButton onClick={handleOpenConfigInfo} />
      </div>
      <div className={styles.mainContent}>
        <Search />
      </div>
      <BottomNavBar />
      <ConfigInfo isOpen={isConfigInfoOpen} onClose={handleCloseConfigInfo} />
    </div>
  );
};

const NewTab: React.FC = () => {
  return <NewTabApp />;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  // 使用 PersistGate 等待持久化数据加载
  root.render(
    <Provider store={store}>
      <PersistGate loading={<Loading />} persistor={persistor}>
        <NewTab />
      </PersistGate>
    </Provider>
  );
}
