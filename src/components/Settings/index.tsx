import React, { useEffect, useRef, useState } from 'react';
import styles from './index.module.css';
import { useAppSelector } from '../../store/hooks';
import { useI18n } from '../../hooks/useI18n';
import Button from '../Button';
import GoogleAccountSetting from './components/GoogleAccountSetting';
import SyncHistorySetting from './components/SyncHistorySetting';
import ThemeColorSetting from './components/ThemeColorSetting';
import LanguageSetting from './components/LanguageSetting';
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
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);


  // 应用主题色到 CSS 变量
  useEffect(() => {
    if (themeColor) {
      document.documentElement.style.setProperty('--color-primary', themeColor);
    }
  }, [themeColor]);

  return (
    <>
      {/* 遮罩层 */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}

      {/* 设置面板 */}
      <div
        ref={panelRef}
        className={`${styles.settingsPanel} ${isOpen ? styles.open : ''} ${isSelectOpen ? styles.selectOpen : ''}`}>
        <div className={`${styles.settingsContainer} ${isSelectOpen ? styles.selectOpen : ''}`}>
          {/* 设置标题区域 */}
          <div className={styles.settingsHeader}>
            <h2 className={styles.settingsTitle}>{t('settings_title')}</h2>
            <Button
              variant="primary"
              iconOnly
              onClick={onClose}
              aria-label={t('settings_closeSettings')}
              className={`${styles.closeButton} closeButton`}>
              <svg className={`icon ${styles.closeIcon}`} aria-hidden="true">
                <use xlinkHref="#icon-guanbi"></use>
              </svg>
            </Button>
          </div>

          {/* 设置项列表区域 */}
          <div className={`${styles.settingsSection} ${isSelectOpen ? styles.selectOpen : ''}`}>
            <GoogleAccountSetting />
            <SyncHistorySetting />
            <ThemeColorSetting />
            <LanguageSetting onSelectOpenChange={setIsSelectOpen} />
            <LinkOpenModeSetting />
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
