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
import { setChecking, setLoggedIn, setHistories, setLoadingHistories, setUserEmail, setUserName, setUserAvatar } from '../store';
import { isLoggedIn as checkIsLoggedIn, loadHistoryFromDriveWithToken, getUserInfo, startAutoSync, stopAutoSync } from '../services/syncService';
import { getAccessToken } from '../services/syncService';
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

  // 应用初始化时检查登录状态，登录成功后拉取历史记录
  useEffect(() => {
    const checkLoginStatusAndLoadHistory = async () => {
      dispatch(setChecking(true));
      try {
        const loggedIn = await checkIsLoggedIn();
        dispatch(setLoggedIn(loggedIn));

        // 如果登录成功，拉取历史记录到 store 并获取用户信息
        if (loggedIn) {
          try {
            dispatch(setLoadingHistories(true));
            const token = await getAccessToken();
            const historyData = await loadHistoryFromDriveWithToken(token);
            if (historyData && historyData.histories) {
              dispatch(setHistories(historyData.histories));
            } else {
              dispatch(setHistories([]));
            }

            // 获取用户信息
            try {
              const userInfo = await getUserInfo();
              if (userInfo?.email) {
                dispatch(setUserEmail(userInfo.email));
              }
              if (userInfo?.name) {
                dispatch(setUserName(userInfo.name));
              }
              if (userInfo?.avatarUrl) {
                dispatch(setUserAvatar(userInfo.avatarUrl));
              }
            } catch (error) {
              console.error('[NewTabApp] 获取用户信息失败:', error);
            }
          } catch (error) {
            console.error('[NewTabApp] 拉取历史记录失败:', error);
            dispatch(setHistories([]));
          } finally {
            dispatch(setLoadingHistories(false));
          }
        } else {
          // 登出时清空用户信息
          dispatch(setUserEmail(null));
          dispatch(setUserName(null));
          dispatch(setUserAvatar(null));
        }
      } catch (error) {
        console.error('[NewTabApp] 检查登录状态失败:', error);
        dispatch(setLoggedIn(false));
      }
    };

    checkLoginStatusAndLoadHistory();
  }, [dispatch]);

  // 监听登录状态变化，管理全局自动同步定时器
  const isLoggedIn = useAppSelector((state) => state.userInfo.isLoggedIn);
  useEffect(() => {
    if (isLoggedIn === true) {
      // 登录后启动自动同步
      startAutoSync();
    } else {
      // 登出后停止自动同步
      stopAutoSync();
    }

    // 组件卸载时清理定时器
    return () => {
      stopAutoSync();
    };
  }, [isLoggedIn]);

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
