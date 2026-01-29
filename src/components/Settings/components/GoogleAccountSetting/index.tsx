import React, { useState, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setLoggedIn, setHistories, setLoadingHistories, setUserEmail, setUserAvatar } from '../../../../store';
import Button from '../../../Button';
import { useI18n } from '../../../../hooks/useI18n';
import { syncConfig, isLoggedIn as checkIsLoggedIn, logout as logoutService, loadHistoryFromDriveWithToken, getAccessToken, getUserInfo } from '../../../../services/syncService';
import { resetConfig } from '../../../../store';
import styles from './index.module.css';

const GoogleAccountSetting: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const isLoggedIn = useAppSelector((state) => state.userInfo.isLoggedIn);
  const isChecking = useAppSelector((state) => state.userInfo.isChecking);
  const userEmail = useAppSelector((state) => state.userInfo.userEmail);
  const userAvatar = useAppSelector((state) => state.userInfo.userAvatar);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 组件挂载时，如果已登录但没有用户信息，则获取用户信息
  useEffect(() => {
    const fetchUserInfoIfNeeded = async () => {
      if (isLoggedIn === true && (!userEmail || !userAvatar)) {
        try {
          const userInfo = await getUserInfo();
          if (userInfo?.email) {
            dispatch(setUserEmail(userInfo.email));
          }
          if (userInfo?.avatarUrl) {
            dispatch(setUserAvatar(userInfo.avatarUrl));
          }
        } catch (error) {
          console.error('[GoogleAccountSetting] 获取用户信息失败:', error);
        }
      }
    };

    fetchUserInfoIfNeeded();
  }, [isLoggedIn, userEmail, userAvatar, dispatch]);

  // 检查 Google OAuth2 登录状态（用于登录/登出后刷新状态）
  // 登录成功后自动拉取历史记录到 store
  const checkGoogleLoginStatus = useCallback(async (): Promise<boolean> => {
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
            if (userInfo?.avatarUrl) {
              dispatch(setUserAvatar(userInfo.avatarUrl));
            }
          } catch (error) {
            console.error('[GoogleAccountSetting] 获取用户信息失败:', error);
          }
        } catch (error) {
          console.error('[GoogleAccountSetting] 拉取历史记录失败:', error);
          dispatch(setHistories([]));
        } finally {
          dispatch(setLoadingHistories(false));
        }
      } else {
        // 登出时清空历史记录和用户信息
        dispatch(setHistories([]));
        dispatch(setUserEmail(null));
        dispatch(setUserAvatar(null));
      }

      return loggedIn;
    } catch (error) {
      console.error('[GoogleAccountSetting] 检查登录状态失败:', error);
      dispatch(setLoggedIn(false));
      dispatch(setHistories([]));
      return false;
    }
  }, [dispatch]);

  // 处理登录 - 使用 useCallback 优化，避免重复创建函数
  const handleLogin = useCallback(async () => {
    if (isLoggingIn) {
      return;
    }

    // 立即更新 UI 状态，让用户看到反馈
    setIsLoggingIn(true);
    setLoginError(null);

    // 使用 Promise 确保异步操作不会阻塞点击处理
    Promise.resolve().then(async () => {
      try {
        // 第一步：只进行登录，获取访问令牌
        // 如果用户未登录，getAccessToken 会触发登录流程（弹出登录窗口）
        // 如果用户取消登录，会抛出错误，我们在这里捕获并处理
        const token = await getAccessToken();

        if (!token) {
          throw new Error('未获取到访问令牌');
        }

        // 登录成功，立即关闭 loading 状态（不等待后续操作）
        setIsLoggingIn(false);

        // 登录成功，异步更新登录状态并获取用户信息（不阻塞UI）
        checkGoogleLoginStatus();

        // 第二步：登录成功后，异步执行配置同步（不阻塞UI）
        // 使用 setTimeout 确保同步操作在登录状态更新后执行
        setTimeout(async () => {
          try {
            console.log('[GoogleAccountSetting] 开始异步同步配置...');
            const result = await syncConfig();

            // 显示同步结果消息（可选，如果需要的话）
            if (result.message) {
              console.log('[GoogleAccountSetting] 同步结果:', result.message);
            }
          } catch (syncErr: any) {
            // 同步失败不影响登录状态，只记录错误
            console.error('[GoogleAccountSetting] 异步同步配置失败:', syncErr);
            // 注意：这里不设置 loginError，因为登录已经成功
            // 同步失败可以在后台重试或由用户手动触发
          }
        }, 100);
      } catch (err: any) {
        const errorMessage = err.message || t('popup_syncFailed') || '登录失败';

        // 检查是否是用户取消登录
        const isUserCancelled = errorMessage.includes('用户取消了登录') ||
                                errorMessage.includes('user cancelled') ||
                                errorMessage.includes('access_denied') ||
                                (errorMessage.includes('OAuth2') && errorMessage.includes('invalid_grant')) ||
                                errorMessage.includes('did not approve access');

        if (isUserCancelled) {
          // 用户取消登录，不显示错误消息，只更新状态
          setLoginError(null);
          dispatch(setLoggedIn(false));
        } else {
          setLoginError(errorMessage);

          // 检查是否是认证错误
          const is401Error = errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized');
          const is403Error = errorMessage.includes('403') || errorMessage.toLowerCase().includes('forbidden') || errorMessage.includes('权限不足');
          const authKeywords = ['登录', 'login', 'token', '认证', 'auth', '授权', 'authorize', 'sign in', '请先登录', '权限不足', 'insufficient', 'scopes'];
          const isAuthError = is401Error || is403Error || authKeywords.some(keyword =>
            errorMessage.toLowerCase().includes(keyword.toLowerCase())
          );

          if (isAuthError) {
            // 权限不足错误：清除登录状态，用户需要重新登录
            dispatch(setLoggedIn(false));
            // 不显示错误消息，因为系统会自动清除旧 token 并在下次登录时重新授权
            // 用户只需要重新点击"登录"按钮即可
            setLoginError(null);
          } else {
            // 如果是其他错误，显示错误消息并重新检查登录状态（异步执行）
            checkGoogleLoginStatus();
          }
        }
      } finally {
        setIsLoggingIn(false);
      }
    });
  }, [isLoggingIn, checkGoogleLoginStatus, t, dispatch]);

  // 处理登出 - 使用 useCallback 优化，避免重复创建函数
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    if (!confirm(t('popup_confirmLogout') || '确定要登出吗？')) {
      return;
    }

    // 立即更新 UI 状态，让用户看到反馈
    setIsLoggingOut(true);
    setLoginError(null);

    // 使用 Promise 确保异步操作不会阻塞点击处理
    Promise.resolve().then(async () => {
      try {
        // 1. 执行退出
        await logoutService();

        // 2. 重置本地配置为默认值（CSS 变量会通过 useEffect 自动更新）
        dispatch(resetConfig());

        // 3. 登出成功，更新 UI 状态
        dispatch(setLoggedIn(false));
      } catch (err: any) {
        console.error('[GoogleAccountSetting] 登出失败:', err);
        const errorMessage = err.message || t('popup_logoutFailed') || '登出失败';
        setLoginError(errorMessage);

        // 即使登出失败，也尝试更新登录状态（可能 token 已经被清除）（异步执行）
        checkGoogleLoginStatus();
      } finally {
        setIsLoggingOut(false);
      }
    });
  }, [isLoggingOut, checkGoogleLoginStatus, t, dispatch]);

  return (
    <div className={styles.settingItem}>
      {isLoggedIn === true ? (
        <div className={styles.accountActions}>
          <span className={styles.avatarDisplay} aria-label={t('popup_loggedIn') || '已登录'}>
            {userAvatar ? (
              <img className={styles.avatarImage} src={userAvatar} alt={userEmail || 'Google'} />
            ) : (
              <span className={styles.avatarFallback}>
                {(userEmail || 'G').charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <Button
            variant="primary"
            onClick={handleLogout}
            disabled={isLoggingOut}
            aria-label={t('popup_logout') || '退出登录'}
            loading={isLoggingOut}>
            {t('popup_logout') || '退出登录'}
          </Button>
        </div>
      ) : (
        <Button
          variant="primary"
          onClick={handleLogin}
          disabled={isLoggingIn || isChecking || isLoggedIn === null}
          aria-label={t('popup_loginWithGoogle') || '通过Google登录'}
          loading={isLoggingIn}>
          {t('popup_loginWithGoogle') || '通过Google登录'}
        </Button>
      )}
      {loginError && (
        <div className={styles.errorMessage}>
          {loginError}
        </div>
      )}
    </div>
  );
};

export default GoogleAccountSetting;
