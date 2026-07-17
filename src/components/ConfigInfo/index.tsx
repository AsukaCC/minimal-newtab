import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import styles from './index.module.css';
import { useAppSelector } from '../../store/hooks';
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
import { SettingsIcon } from '../../common/svgIcon';
import type { PageComponent } from './types';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface ConfigInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConfigInfo: React.FC<ConfigInfoProps> = ({ isOpen, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const slidingWrapperRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const themeColor = useAppSelector((state) => state.config.themeColor);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  // 页面栈：动态存储所有页面组件
  const [pages, setPages] = useState<PageComponent[]>([]);
  const pagesRef = useRef<PageComponent[]>([]);
  const isSlidingBackRef = useRef(false);
  const reducedMotion = useReducedMotion();

  // 保持 pagesRef 同步
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);
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

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!panel || !overlay) return;

    gsap.killTweensOf([panel, overlay]);
    const duration = reducedMotion ? 0 : isOpen ? 0.36 : 0.24;
    const timeline = gsap.timeline({ defaults: { overwrite: 'auto' } });

    if (isOpen) {
      gsap.set(overlay, { visibility: 'visible', pointerEvents: 'auto' });
      timeline
        .to(overlay, { autoAlpha: 1, duration: reducedMotion ? 0 : 0.2, ease: 'power1.out' }, 0)
        .to(panel, {
          x: 0,
          duration,
          ease: 'power3.out',
          force3D: true,
        }, 0);
    } else {
      timeline
        .to(overlay, { autoAlpha: 0, duration: reducedMotion ? 0 : 0.18, ease: 'power1.in' }, 0)
        .to(panel, {
          x: panel.offsetWidth,
          duration,
          ease: 'power2.in',
          force3D: true,
        }, 0)
        .set(overlay, { visibility: 'hidden', pointerEvents: 'none' })
        .add(() => {
          gsap.set(slidingWrapperRef.current, { xPercent: 0 });
          isSlidingBackRef.current = false;
          setPages([]);
          setIsSelectOpen(false);
        });
    }

    return () => {
      timeline.kill();
    };
  }, [isOpen, reducedMotion]);

  // 应用主题色到 CSS 变量
  useEffect(() => {
    if (themeColor) {
      document.documentElement.style.setProperty('--color-primary', themeColor);
    }
  }, [themeColor]);

  // 返回上一页
  const handleBack = useCallback(() => {
    const wrapper = slidingWrapperRef.current;
    if (isSlidingBackRef.current || pagesRef.current.length <= 1 || !wrapper) return;

    isSlidingBackRef.current = true;
    const targetLevel = pagesRef.current.length - 2;
    gsap.to(wrapper, {
      xPercent: targetLevel * -33.333,
      duration: reducedMotion ? 0 : 0.3,
      ease: 'power3.inOut',
      force3D: true,
      overwrite: 'auto',
      onComplete: () => {
        setPages((prev) => prev.slice(0, -1));
        setIsSelectOpen(false);
        isSlidingBackRef.current = false;
      },
    });
  }, [reducedMotion]);

  // 推送新页面到栈中
  const pushPage = useCallback((pageId: string) => {
    if (isSlidingBackRef.current) return;

    let newPage: PageComponent;

    switch (pageId) {
      case 'syncHistory':
        newPage = {
          id: 'syncHistory',
          titleKey: 'settings_syncHistory',
          title: '同步历史',
          showHeader: true,
          showBack: true,
          component: (
            <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
              <div className={styles.settingsHeader}>
                <ConfigInfoSubHeader onBack={handleBack} titleKey="settings_syncHistory" />
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
          titleKey: 'settings_navBarConfig',
          title: '导航栏配置',
          showHeader: true,
          showBack: true,
          component: (
            <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
              <div className={styles.settingsHeader}>
                <ConfigInfoSubHeader onBack={handleBack} titleKey="settings_navBarConfig" />
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
  }, [handleBack, t, isSelectOpen]);

  useLayoutEffect(() => {
    const wrapper = slidingWrapperRef.current;
    if (!wrapper || isSlidingBackRef.current || pages.length === 0) return;

    gsap.to(wrapper, {
      xPercent: (pages.length - 1) * -33.333,
      duration: reducedMotion ? 0 : 0.34,
      ease: 'power3.inOut',
      force3D: true,
      overwrite: 'auto',
    });
  }, [pages.length, reducedMotion]);

  return (
    <>
      {/* 遮罩层 */}
      <div ref={overlayRef} className={styles.overlay} onClick={onClose} />

      {/* 设置面板 */}
      <div
        ref={panelRef}
        className={`${styles.settingsPanel} ${isSelectOpen ? styles.selectOpen : ''}`}>

        <div
          ref={slidingWrapperRef}
          className={styles.slidingWrapper}>
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
