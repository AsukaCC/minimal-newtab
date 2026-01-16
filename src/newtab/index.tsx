import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import '../style.css';
import '../utils/iconfont.js';
import { store, persistor } from '../store/store';
import ThemeButton from '../components/ThemeButton';
import { useTheme } from '../hooks/useTheme';
import { useAppSelector } from '../store/hooks';
import styles from './index.module.css';
import Search from '../components/Search';
import Loading from '../components/Loading';
import SettingsPage, { SettingsButton } from '../components/Settings';

const NewTabApp: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const themeColor = useAppSelector((state) => state.config.themeColor);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 应用主题色
  useEffect(() => {
    if (themeColor) {
      document.documentElement.style.setProperty('--color-primary', themeColor);
    }
  }, [themeColor]);

  const handleOpenSettings = () => {
    setIsSettingsOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsOpen(false);
  };

  return (
    <div className={`${styles.newtabPage} ${styles.container}`}>
      <div className={styles.tools}>
        <ThemeButton isDarkMode={isDarkMode} onChange={toggleTheme} />
        <SettingsButton onClick={handleOpenSettings} />
      </div>
      <div className={styles.mainContent}>
        <Search />
      </div>
      <SettingsPage isOpen={isSettingsOpen} onClose={handleCloseSettings} />
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
