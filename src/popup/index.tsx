import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import '../style.css';
import { store, persistor } from '../store';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import styles from './index.module.css';

const WelcomePage: React.FC = () => {
  const { t } = useI18n();
  useTheme(); // 确保主题同步

  useEffect(() => {
    document.title = t('extensionName');
  }, [t]);

  return (
    <div className={styles.container}>
      <div className={styles.welcomeContainer}>
        <div className={styles.welcomeContent}>
          <div className={styles.logo}>
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                fill="currentColor"
              />
            </svg>
          </div>
          <h1 className={styles.welcomeTitle}>{t('popup_welcomeMessage')}</h1>
          <p className={styles.welcomeDescription}>
            {t('popup_welcome')}
          </p>
        </div>
      </div>
    </div>
  );
};

const Popup: React.FC = () => {
  useTheme();

  useEffect(() => {
    // 设置 popup 窗口宽度
    document.documentElement.style.width = '500px';
    document.documentElement.style.minWidth = '500px';
    document.body.style.width = '500px';
    document.body.style.minWidth = '500px';

    document.body.classList.add(styles.popupPage);
    return () => {
      document.body.classList.remove(styles.popupPage);
    };
  }, []);

  return <WelcomePage />;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);

  root.render(
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Popup />
      </PersistGate>
    </Provider>
  );
}
