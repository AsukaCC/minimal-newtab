import React, { useState } from 'react';
import styles from '../../index.module.css';
import Button from '../../../Button';
import { CloseIcon, Google } from '../../../../common/svgIcon';
import { useAppSelector, useAppDispatch } from '../../../../store/hooks';
import {
  setLoggedIn,
  setHistories,
  setLoadingHistories,
  setUserEmail,
  setUserName,
  setUserAvatar,
  resetConfig,
} from '../../../../store';
import {
  getAccessToken,
  getUserInfo,
  loadHistoryFromDriveWithToken,
  logout as logoutService,
} from '../../../../services/syncService';

export interface ConfigInfoHeaderProps {
  onClose: () => void;
  t: (key: string) => string | undefined;
}

const ConfigInfoHeader: React.FC<ConfigInfoHeaderProps> = ({ onClose, t }) => {
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector((state) => state.userInfo.isLoggedIn);
  const userEmail = useAppSelector((state) => state.userInfo.userEmail);
  const userName = useAppSelector((state) => state.userInfo.userName);
  const userAvatar = useAppSelector((state) => state.userInfo.userAvatar);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isHoveringAccount, setIsHoveringAccount] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    try {
      let cancelGuard: ReturnType<typeof setTimeout>;
      const token = await Promise.race([
        getAccessToken(),
        new Promise<string | undefined>((_, reject) => {
          cancelGuard = setTimeout(() => reject(new Error('user cancelled')), 120_000);
        }),
      ]).finally(() => clearTimeout(cancelGuard));

      if (!token) throw new Error('未获取到访问令牌');

      // 立即获取用户信息并更新状态，UI 快速响应
      try {
        const userInfo = await getUserInfo();
        dispatch(setLoggedIn(true));
        if (userInfo?.email) dispatch(setUserEmail(userInfo.email));
        if (userInfo?.name) dispatch(setUserName(userInfo.name));
        if (userInfo?.avatarUrl) dispatch(setUserAvatar(userInfo.avatarUrl));
      } catch {
        dispatch(setLoggedIn(true));
      }

      // 后台静默：加载历史记录（复用登录时已获取的 token，避免重复请求）
      (async () => {
        try {
          dispatch(setLoadingHistories(true));
          const historyData = await loadHistoryFromDriveWithToken(token);
          dispatch(setHistories(historyData?.histories ?? []));
        } catch {
          dispatch(setHistories([]));
        } finally {
          dispatch(setLoadingHistories(false));
        }
      })();
    } catch (err: any) {
      const msg = err.message || '';
      const isCancelled =
        ['用户取消了登录', 'user cancelled', 'access_denied', 'did not approve access', 'OAuth2 not granted or revoked'].some((s) =>
          msg.includes(s)
        ) ||
        (msg.includes('OAuth2') && msg.includes('invalid_grant'));

      if (!isCancelled) {
        console.error('[ConfigInfoHeader] 登录失败:', msg);
      }
      dispatch(setLoggedIn(false));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    if (!confirm(t('popup_confirmLogout') || '确定要登出吗？')) return;

    // 立即清除所有用户状态，UI 即时响应
    dispatch(setLoggedIn(false));
    dispatch(setUserEmail(null));
    dispatch(setUserName(null));
    dispatch(setUserAvatar(null));
    dispatch(setHistories([]));
    dispatch(resetConfig());

    // 后台静默：调用退出服务
    (async () => {
      try {
        await logoutService();
      } catch (err) {
        console.error('[ConfigInfoHeader] 退出登录服务失败:', err);
      }
    })();
  };

  return (
    <>
      <div className={styles.accountWrapper}>
        <div
          className={`${styles.accountInfo} ${isLoggedIn !== true ? styles.accountInfoGuest : ''}`}
          onMouseEnter={() => setIsHoveringAccount(true)}
          onMouseLeave={() => setIsHoveringAccount(false)}
        >
          {isLoggedIn === true ? (
            <>
              <div className={styles.accountAvatar}>
                {userAvatar ? (
                  <img className={styles.avatarImage} src={userAvatar} alt={userEmail || 'Google'} />
                ) : (
                  <span className={styles.avatarFallback}>
                    {(userEmail || 'G').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className={styles.accountName}>{userName || 'Hi, there!'}</span>
              {isHoveringAccount && (
                <div className={styles.logoutButtonWrapper}>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={handleLogout}
                    aria-label={t('popup_logout') || '退出登录'}
                  >
                    {t('popup_logout') || '退出登录'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <button
              type="button"
              className={styles.accountSignIn}
              onClick={handleLogin}
              disabled={isLoggingIn}
              aria-label={t('popup_loginWithGoogle') || '通过Google登录'}
            >
              {isLoggingIn ? (
                <span className={styles.accountSignInSpinner} aria-hidden />
              ) : (
                <Google className={styles.accountSignInIcon} />
              )}
              <span className={styles.accountSignInText}>
                {t('popup_loginWithGoogle') || '通过Google登录'}
              </span>
            </button>
          )}
        </div>
      </div>
      <button onClick={onClose} aria-label={t('settings_closeSettings')} className={styles.closeButton}>
        <CloseIcon className={styles.closeIcon} />
      </button>
    </>
  );
};

export default ConfigInfoHeader;
