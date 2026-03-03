import React, { useEffect, useRef, useState, useCallback } from 'react';
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

interface ConfigInfoProps {
  isOpen: boolean;
  onClose: () => void;
}

const ConfigInfo: React.FC<ConfigInfoProps> = ({ isOpen, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const slidingWrapperRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
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
