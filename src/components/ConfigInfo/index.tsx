import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from './index.module.css';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useI18n } from '../../hooks/useI18n';
import SyncHistorySetting from './components/SyncHistorySetting';
import SyncHistoryModal from '../SyncHistoryModal';
import ThemeColorSetting from './components/ThemeColorSetting';
import LanguageSetting from './components/LanguageSetting';
import LinkOpenModeSetting from './components/LinkOpenModeSetting';
import NavBarSetting from './components/NavBarSetting';
import NavBarConfigPage from './components/NavBarConfigPage';
import ConfigInfoHeader from './components/ConfigInfoHeader';
import ConfigInfoSubHeader from './components/ConfigInfoSubHeader';
import { logout as logoutService, isLoggedIn as checkIsLoggedIn, getAccessToken, loadHistoryFromDriveWithToken, getUserInfo, syncConfig } from '../../services/syncService';
import { setLoggedIn, setHistories, setLoadingHistories, setUserEmail, setUserName, setUserAvatar } from '../../store';
import { resetConfig } from '../../store';
import { SettingsIcon } from '../../common/svgIcon';
import type { PageComponent } from './types';

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
  // 页面栈：动态存储所有页面组件
  const [pages, setPages] = useState<PageComponent[]>([]);
  const pagesRef = useRef<PageComponent[]>([]);
  const [isSlidingBack, setIsSlidingBack] = useState(false);

  // 保持 pagesRef 同步
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const userEmail = useAppSelector((state) => state.userInfo.userEmail);
  const userName = useAppSelector((state) => state.userInfo.userName);
  const userAvatar = useAppSelector((state) => state.userInfo.userAvatar);
  const isLoggedIn = useAppSelector((state) => state.userInfo.isLoggedIn);

  // 初始化主页
  useEffect(() => {
    if (!isOpen || pages.length > 0) return;

    // 直接初始化主页
    const homePage: PageComponent = {
      id: 'home',
      showHeader: false,
      component: (
        <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
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
          <div className={`${styles.settingsSection} ${isSelectOpen ? styles.selectOpen : ''}`}>
            <SyncHistorySetting onOpenHistory={() => pushPage('syncHistory')} />
            <ThemeColorSetting />
            <LanguageSetting onSelectOpenChange={setIsSelectOpen} />
            <LinkOpenModeSetting />
            <NavBarSetting onOpenConfig={() => pushPage('navBarConfig')} />
          </div>
        </div>
      ),
    };

    setPages([homePage]);
  }, [isOpen]);

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
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (pages.length > 1) {
          handleBack();
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, pages]);

  // 重置页面栈状态
  useEffect(() => {
    if (!isOpen) {
      setPages([]);
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

  // 返回上一页
  const handleBack = useCallback(() => {
    if (isSlidingBack || pagesRef.current.length <= 1) return;
    setIsSlidingBack(true);
  }, [isSlidingBack]);

  // 推送新页面到栈中
  const pushPage = useCallback((pageId: string) => {
    if (isSlidingBack) return;

    let newPage: PageComponent;

    switch (pageId) {
      case 'syncHistory':
        newPage = {
          id: 'syncHistory',
          title: t('settings_syncHistory') || '同步历史',
          showHeader: true,
          showBack: true,
          component: (
            <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
              <div className={styles.settingsHeader}>
                <ConfigInfoSubHeader onBack={handleBack} t={t} title={t('settings_syncHistory') || '同步历史'} />
              </div>
              <div className={`${styles.settingsSection} ${isSelectOpen ? styles.selectOpen : ''}`}>
                <SyncHistoryModal isOpen={true} onClose={handleBack} isSubPage={true} />
              </div>
            </div>
          ),
        };
        break;

      case 'navBarConfig':
        newPage = {
          id: 'navBarConfig',
          title: t('settings_navBarConfig') || '导航栏配置',
          showHeader: true,
          showBack: true,
          component: (
            <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
              <div className={styles.settingsHeader}>
                <ConfigInfoSubHeader onBack={handleBack} t={t} title={t('settings_navBarConfig') || '导航栏配置'} />
              </div>
              <div className={`${styles.settingsSection} ${isSelectOpen ? styles.selectOpen : ''}`}>
                <NavBarConfigPage />
              </div>
            </div>
          ),
        };
        break;

      default:
        return;
    }

    setPages(prev => [...prev, newPage]);
  }, [isSlidingBack, handleBack, t, isSelectOpen]);

  // 返回动画处理
  useEffect(() => {
    if (!isSlidingBack) return;
    const el = slidingWrapperRef.current;
    if (!el) {
      setIsSlidingBack(false);
      setPages(prev => prev.slice(0, -1));
      setIsSelectOpen(false);
      return;
    }

    // 先更新页面栈，触发 CSS transform 变化产生动画
    setPages(prev => prev.slice(0, -1));
    setIsSelectOpen(false);

    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target !== el || e.propertyName !== 'transform') return;
      el.removeEventListener('transitionend', onTransitionEnd);
      setIsSlidingBack(false);
    };
    el.addEventListener('transitionend', onTransitionEnd);
    return () => el.removeEventListener('transitionend', onTransitionEnd);
  }, [isSlidingBack]);

  // 计算滑动容器的 className
  const getSlidingWrapperClassName = () => {
    if (isSlidingBack) return styles.slidingWrapper;
    // 根据页面栈长度计算偏移量
    if (pages.length === 2) return `${styles.slidingWrapper} ${styles.slideLevel1}`;
    if (pages.length === 3) return `${styles.slidingWrapper} ${styles.slideLevel2}`;
    return styles.slidingWrapper;
  };

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
          className={getSlidingWrapperClassName()}>
          {/* 渲染页面栈中的所有页面 */}
          {pages.map((page, index) => (
            <div key={`${page.id}-${index}`} className={styles.pageContent}>
              {page.component}
            </div>
          ))}
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
      <SettingsIcon className={`icon ${styles.closeIcon}`} />
    </button>
  );
};

export default ConfigInfo;
