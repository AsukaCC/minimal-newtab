import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import '../style.css';
import { store, persistor } from '../store/store';
import ThemeButton from '../components/ThemeButton';
import { useTheme } from '../hooks/useTheme';
import styles from './index.module.css';

const NewTabApp: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <div className={`${styles.newtabPage} ${styles.container}`}>
      <div className={styles.themeButtonWrapper}>
        <ThemeButton isDarkMode={isDarkMode} onChange={toggleTheme} />
      </div>
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
      <PersistGate loading={null} persistor={persistor}>
        <NewTab />
      </PersistGate>
    </Provider>
  );
}
