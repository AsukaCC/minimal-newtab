import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './index.module.css';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useI18n } from '../../hooks/useI18n';
import SyncHistorySetting from './components/SyncHistorySetting';
import SyncHistoryModal from '../SyncHistoryModal';
import ThemeColorSetting from './components/ThemeColorSetting';
import LanguageSetting from './components/LanguageSetting';
import ThemeAndLanguageSetting from './components/ThemeAndLanguageSetting';
import LinkOpenModeSetting from './components/LinkOpenModeSetting';
import ConfigInfoHeader from './components/ConfigInfoHeader';
import ConfigInfoSubHeader from './components/ConfigInfoSubHeader';
import { logout as logoutService, isLoggedIn as checkIsLoggedIn, getAccessToken, loadHistoryFromDriveWithToken, getUserInfo, syncConfig } from '../../services/syncService';
import { setLoggedIn, setHistories, setLoadingHistories, setUserEmail, setUserName, setUserAvatar } from '../../store';
import { resetConfig } from '../../store';

interface ConfigInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConfigInfo: React.FC<ConfigInfoProps> = ({ isOpen, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const slidingWrapperRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const themeColor = useAppSelector((state) => state.config.themeColor);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);
  /** 正在执行“返回”的平移动画，动画结束后再清空 activeSubPage，这样回退时也有书本式平移 */
  const [isSlidingBack, setIsSlidingBack] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const userEmail = useAppSelector((state) => state.userInfo.userEmail);
  const userName = useAppSelector((state) => state.userInfo.userName);
  const userAvatar = useAppSelector((state) => state.userInfo.userAvatar);
  const isLoggedIn = useAppSelector((state) => state.userInfo.isLoggedIn);

  // 处理点击外部区域关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        isOpen
      ) {
        onClose();
      }
    };

    if (isOpen) {
      // 使用 setTimeout 确保点击事件先处理完
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 处理 ESC 键关闭（有子页时走 handleBack，带平移动画）
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (activeSubPage) {
          handleBackRef.current();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, activeSubPage]);

  // 重置子页面状态
  useEffect(() => {
    if (!isOpen) {
      setActiveSubPage(null);
      setIsSelectOpen(false);
      setIsSlidingBack(false);
    }
  }, [isOpen]);


  // 应用主题色到 CSS 变量
  useEffect(() => {
    if (themeColor) {
      document.documentElement.style.setProperty('--color-primary', themeColor);
    }
  }, [themeColor]);

  // 检查 Google OAuth2 登录状态
  const checkGoogleLoginStatus = useCallback(async (): Promise<boolean> => {
    try {
      const loggedIn = await checkIsLoggedIn();
      dispatch(setLoggedIn(loggedIn));

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
            console.error('[ConfigInfo] 获取用户信息失败:', error);
          }
        } catch (error) {
          console.error('[ConfigInfo] 拉取历史记录失败:', error);
          dispatch(setHistories([]));
        } finally {
          dispatch(setLoadingHistories(false));
        }
      } else {
        dispatch(setHistories([]));
        dispatch(setUserEmail(null));
        dispatch(setUserName(null));
        dispatch(setUserAvatar(null));
      }

      return loggedIn;
    } catch (error) {
      console.error('[ConfigInfo] 检查登录状态失败:', error);
      dispatch(setLoggedIn(false));
      dispatch(setHistories([]));
      return false;
    }
  }, [dispatch]);

  // 处理登录
  const handleLogin = useCallback(async () => {
    if (isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);

    Promise.resolve().then(async () => {
      try {
        const token = await getAccessToken();

        if (!token) {
          throw new Error('未获取到访问令牌');
        }

        setIsLoggingIn(false);

        checkGoogleLoginStatus();

        setTimeout(async () => {
          try {
            console.log('[ConfigInfo] 开始异步同步配置...');
            const result = await syncConfig();
            if (result.message) {
              console.log('[ConfigInfo] 同步结果:', result.message);
            }
          } catch (syncErr: any) {
            console.error('[ConfigInfo] 异步同步配置失败:', syncErr);
          }
        }, 100);
      } catch (err: any) {
        const errorMessage = err.message || t('popup_syncFailed') || '登录失败';

        const isUserCancelled = errorMessage.includes('用户取消了登录') ||
          errorMessage.includes('user cancelled') ||
          errorMessage.includes('access_denied') ||
          (errorMessage.includes('OAuth2') && errorMessage.includes('invalid_grant')) ||
          errorMessage.includes('did not approve access');

        if (isUserCancelled) {
          dispatch(setLoggedIn(false));
        } else {
          const is401Error = errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized');
          const is403Error = errorMessage.includes('403') || errorMessage.toLowerCase().includes('forbidden') || errorMessage.includes('权限不足');
          const authKeywords = ['登录', 'login', 'token', '认证', 'auth', '授权', 'authorize', 'sign in', '请先登录', '权限不足', 'insufficient', 'scopes'];
          const isAuthError = is401Error || is403Error || authKeywords.some(keyword =>
            errorMessage.toLowerCase().includes(keyword.toLowerCase())
          );

          if (isAuthError) {
            dispatch(setLoggedIn(false));
          } else {
            checkGoogleLoginStatus();
          }
        }
      } finally {
        setIsLoggingIn(false);
      }
    });
  }, [isLoggingIn, checkGoogleLoginStatus, t, dispatch]);

  // 处理登出
  const handleLogout = useCallback(async () => {
    if (isLoggingOut) {
      return;
    }

    if (!confirm(t('popup_confirmLogout') || '确定要登出吗？')) {
      return;
    }

    setIsLoggingOut(true);

    Promise.resolve().then(async () => {
      try {
        await logoutService();
        dispatch(resetConfig());
        dispatch(setLoggedIn(false));
      } catch (err: any) {
        console.error('[ConfigInfo] 登出失败:', err);
        checkGoogleLoginStatus();
      } finally {
        setIsLoggingOut(false);
      }
    });
  }, [isLoggingOut, checkGoogleLoginStatus, t, dispatch]);

  const handleBackRef = useRef<() => void>(() => {});
  const handleBack = () => {
    if (isSlidingBack) return;
    setIsSlidingBack(true);
  };
  handleBackRef.current = handleBack;

  // 返回动画结束后再清空子页，这样回退时能看到书本式平移
  useEffect(() => {
    if (!isSlidingBack) return;
    const el = slidingWrapperRef.current;
    if (!el) {
      setIsSlidingBack(false);
      setActiveSubPage(null);
      setIsSelectOpen(false);
      return;
    }
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target !== el || e.propertyName !== 'transform') return;
      el.removeEventListener('transitionend', onTransitionEnd);
      setIsSlidingBack(false);
      setActiveSubPage(null);
      setIsSelectOpen(false);
    };
    el.addEventListener('transitionend', onTransitionEnd);
    return () => el.removeEventListener('transitionend', onTransitionEnd);
  }, [isSlidingBack]);

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}

      {/* 设置面板 */}
      <div
        ref={panelRef}
        className={`${styles.settingsPanel} ${isOpen ? styles.open : ''} ${isSelectOpen ? styles.selectOpen : ''}`}>

        <div
          ref={slidingWrapperRef}
          className={`${styles.slidingWrapper} ${activeSubPage && !isSlidingBack ? styles.slideActive : ''}`}>
          {/* 主页面 */}
          <div className={styles.pageContent}>
            <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
              {/* Google 账户与关闭按钮通过 flex 布局并列 */}
              <div className={styles.settingsHeader}>
                <ConfigInfoHeader
                  isLoggedIn={isLoggedIn}
                  userEmail={userEmail}
                  userName={userName}
                  userAvatar={userAvatar}
                  isLoggingOut={isLoggingOut}
                  isLoggingIn={isLoggingIn}
                  onLogout={handleLogout}
                  onLogin={handleLogin}
                  onClose={onClose}
                  t={t}
                />
              </div>

              {/* 设置项列表区域 */}
              <div className={`${styles.settingsSection} ${isSelectOpen ? styles.selectOpen : ''}`}>
                <SyncHistorySetting onOpenHistory={() => setActiveSubPage('syncHistory')} />
                <ThemeAndLanguageSetting onOpen={() => setActiveSubPage('themeLanguage')} />
              </div>
            </div>
          </div>

          {/* 子页面 */}
          <div className={styles.pageContent}>
            <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
              <div className={styles.settingsHeader}>
                <ConfigInfoSubHeader
                  activeSubPage={activeSubPage}
                  onBack={handleBack}
                  t={t}
                />
              </div>

              <div className={`${styles.settingsSection} ${isSelectOpen ? styles.selectOpen : ''}`}>
                {activeSubPage === 'syncHistory' && (
                  <SyncHistoryModal isOpen={true} onClose={handleBack} isSubPage={true} />
                )}
                {activeSubPage === 'themeLanguage' && (
                  <>
                    <ThemeColorSetting />
                    <LanguageSetting onSelectOpenChange={setIsSelectOpen} />
                    <LinkOpenModeSetting />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

interface ConfigInfoButtonProps {
  onClick: () => void;
}

export const ConfigInfoButton: React.FC<ConfigInfoButtonProps> = ({ onClick }) => {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      aria-label={t('settings_openSettings')}
      className={styles.closeButton}>
      <svg className={`icon ${styles.closeIcon}`} aria-hidden="true">
        <use xlinkHref="#icon-shezhi"></use>
      </svg>
    </button>
  );
};

export default ConfigInfo;
