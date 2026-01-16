import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import '../style.css';
import { store, persistor } from '../store/store';
import { useTheme } from '../hooks/useTheme';
import styles from './index.module.css';

// Google OAuth 配置
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_REDIRECT_URI = chrome.identity.getRedirectURL();
const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(
  GOOGLE_REDIRECT_URI
)}&response_type=token&scope=openid%20email%20profile`;

interface UserInfo {
  email: string;
  name: string;
  picture?: string;
}

const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  useTheme(); // 确保主题同步

  // 检查是否已登录
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const result = await chrome.storage.local.get([
        'googleAccessToken',
        'userInfo',
      ]);
      if (result.googleAccessToken && result.userInfo) {
        setIsAuthenticated(true);
        setUserInfo(result.userInfo);
      }
    } catch (err) {
      console.error('检查登录状态失败:', err);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 使用 Chrome Identity API 进行 OAuth 登录
      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: GOOGLE_AUTH_URL,
        interactive: true,
      });

      if (!responseUrl) {
        throw new Error('登录被取消');
      }

      // 从回调 URL 中提取 access token
      const urlParams = new URLSearchParams(responseUrl.split('#')[1]);
      const accessToken = urlParams.get('access_token');

      if (!accessToken) {
        throw new Error('无法获取访问令牌');
      }

      // 保存 access token
      await chrome.storage.local.set({ googleAccessToken: accessToken });

      // 获取用户信息
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );

      if (!userInfoResponse.ok) {
        throw new Error('获取用户信息失败');
      }

      const userData = await userInfoResponse.json();
      const user: UserInfo = {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
      };

      // 保存用户信息
      await chrome.storage.local.set({ userInfo: user });
      setIsAuthenticated(true);
      setUserInfo(user);
    } catch (err: any) {
      console.error('登录失败:', err);
      setError(err.message || '登录失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await chrome.storage.local.remove(['googleAccessToken', 'userInfo']);
      setIsAuthenticated(false);
      setUserInfo(null);
    } catch (err) {
      console.error('登出失败:', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginContainer}>
        {!isAuthenticated ? (
          <>
            <div className={styles.logo}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </div>
            <h1 className={styles.title}>欢迎使用</h1>
            <p className={styles.subtitle}>
              使用 Google 账号登录以同步您的数据
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <button
              className={styles.googleButton}
              onClick={handleGoogleLogin}
              disabled={isLoading}>
              {isLoading ? (
                <span className={styles.loading}>
                  <span className={styles.spinner}></span>
                  登录中...
                </span>
              ) : (
                <>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  使用 Google 登录
                </>
              )}
            </button>

            <p className={styles.hint}>
              登录后，您的配置和数据将在所有设备间同步
            </p>
          </>
        ) : (
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {userInfo?.picture ? (
                <img src={userInfo.picture} alt={userInfo.name} />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {userInfo?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <h2 className={styles.userName}>{userInfo?.name}</h2>
            <p className={styles.userEmail}>{userInfo?.email}</p>
            <div className={styles.status}>
              <span className={styles.statusDot}></span>
              <span>已同步</span>
            </div>
            <button className={styles.logoutButton} onClick={handleLogout}>
              退出登录
            </button>
          </div>
        )}
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

  return <LoginPage />;
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
