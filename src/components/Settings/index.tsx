import React, { useEffect, useRef, useState } from 'react';
import styles from './index.module.css';
import { useAppSelector } from '../../store/hooks';
import { useI18n } from '../../hooks/useI18n';
import Button from '../Button';
import GoogleAccountSetting from './components/GoogleAccountSetting';
import SyncHistorySetting from './components/SyncHistorySetting';
import SyncHistoryModal from '../SyncHistoryModal';
import ThemeColorSetting from './components/ThemeColorSetting';
import LanguageSetting from './components/LanguageSetting';
import ThemeAndLanguageSetting from './components/ThemeAndLanguageSetting';
import LinkOpenModeSetting from './components/LinkOpenModeSetting';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ isOpen, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const themeColor = useAppSelector((state) => state.config.themeColor);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);

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

  // 处理 ESC 键关闭
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        if (activeSubPage) {
          setActiveSubPage(null);
          setIsSelectOpen(false);
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
    }
  }, [isOpen]);


  // 应用主题色到 CSS 变量
  useEffect(() => {
    if (themeColor) {
      document.documentElement.style.setProperty('--color-primary', themeColor);
    }
  }, [themeColor]);

  const handleBack = () => {
    setActiveSubPage(null);
    setIsSelectOpen(false);
  };

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}

      {/* 设置面板 */}
      <div
        ref={panelRef}
        className={`${styles.settingsPanel} ${isOpen ? styles.open : ''} ${isSelectOpen ? styles.selectOpen : ''}`}>
        
        <div className={`${styles.slidingWrapper} ${activeSubPage ? styles.slideActive : ''}`}>
          {/* 主页面 */}
          <div className={styles.pageContent}>
            <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
              {/* Google 账户与关闭按钮通过 flex 布局并列 */}
              <div className={styles.settingsHeader}>
                <div className={styles.accountWrapper}>
                  <GoogleAccountSetting />
                </div>
                <button
                  onClick={onClose}
                  aria-label={t('settings_closeSettings')}
                  className={styles.closeButton}>
                  <svg className={`icon ${styles.closeIcon}`} aria-hidden="true">
                    <use xlinkHref="#icon-guanbi"></use>
                  </svg>
                </button>
              </div>

              {/* 设置项列表区域 */}
              <div className={`${styles.settingsSection} ${isSelectOpen ? styles.selectOpen : ''}`}>
                <SyncHistorySetting onOpenHistory={() => setActiveSubPage('syncHistory')} />
                <ThemeAndLanguageSetting onOpen={() => setActiveSubPage('themeLanguage')} />
                <LinkOpenModeSetting />
              </div>
            </div>
          </div>

          {/* 子页面 */}
          <div className={styles.pageContent}>
            <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
              <div className={styles.settingsHeader}>
                <div className={styles.headerLeft}>
                  <button
                    onClick={handleBack}
                    aria-label={t('common_back')}
                    className={styles.backButton}>
                    <svg
                      className={`icon ${styles.backIcon}`}
                      aria-hidden="true"
                      viewBox="0 0 24 24">
                      <path
                        d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <h2 className={styles.subPageTitle}>
                    {activeSubPage === 'syncHistory'
                      ? t('popup_syncHistory')
                      : activeSubPage === 'themeLanguage'
                        ? t('settings_themeAndLanguage')
                        : ''}
                  </h2>
                </div>
              </div>
              
              <div className={`${styles.settingsSection} ${isSelectOpen ? styles.selectOpen : ''}`}>
                {activeSubPage === 'syncHistory' && (
                  <SyncHistoryModal isOpen={true} onClose={handleBack} isSubPage={true} />
                )}
                {activeSubPage === 'themeLanguage' && (
                  <>
                    <ThemeColorSetting />
                    <LanguageSetting onSelectOpenChange={setIsSelectOpen} />
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

interface SettingsButtonProps {
  onClick: () => void;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ onClick }) => {
  const { t } = useI18n();
  return (
    <Button
      variant="primary"
      iconOnly
      onClick={onClick}
      aria-label={t('settings_openSettings')}
      className={styles.settingsButton}>
      <svg className={`icon ${styles.settingsIcon}`} aria-hidden="true">
        <use xlinkHref="#icon-shezhi"></use>
      </svg>
    </Button>
  );
};

export default SettingsPage;
