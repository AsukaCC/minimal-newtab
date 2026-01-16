import React, { useEffect, useRef } from 'react';
import styles from './index.module.css';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setIsDirectLink, setThemeColor } from '../../store/configSlice';
import Switch from '../Switch';

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ isOpen, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const isDirectLink = useAppSelector((state) => state.config.isDirectLink);
  const themeColor = useAppSelector((state) => state.config.themeColor);

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

  const handleToggleDirectLink = (checked: boolean) => {
    dispatch(setIsDirectLink(checked));
  };

  const handleThemeColorChange = (color: string) => {
    dispatch(setThemeColor(color));
    // 更新 CSS 变量
    document.documentElement.style.setProperty('--color-primary', color);
  };

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
        className={`${styles.settingsPanel} ${isOpen ? styles.open : ''}`}>
        <div className={styles.settingsContainer}>
          {/* 设置标题区域 */}
          <div className={styles.settingsHeader}>
            <h2 className={styles.settingsTitle}>设置</h2>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="关闭设置">
              <svg className={`icon ${styles.closeIcon}`} aria-hidden="true">
                <use xlinkHref="#icon-guanbi"></use>
              </svg>
            </button>
          </div>

          {/* 设置项列表区域 */}
          <div className={styles.settingsSection}>
            {/* 主题色 */}
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                <span className={styles.settingText}>主题色</span>
                <span className={styles.settingDescription}>系统主题色</span>
              </label>
              <div className={styles.themeColorPicker}>
                <input
                  type="color"
                  value={themeColor || '#667eea'}
                  onChange={(e) => handleThemeColorChange(e.target.value)}
                  className={styles.colorInput}
                  aria-label="选择主题色"
                />
              </div>
            </div>
            {/* 链接打开方式 */}
            <div className={styles.settingItem}>
              <label className={styles.settingLabel}>
                <span className={styles.settingText}>链接打开方式</span>
                <span className={styles.settingDescription}>
                  {isDirectLink ? '当前标签页打开' : '新标签页打开'}
                </span>
              </label>
              <Switch
                checked={isDirectLink}
                onChange={handleToggleDirectLink}
                ariaLabel="切换链接打开方式"
              />
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
  return (
    <button
      className={styles.settingsButton}
      onClick={onClick}
      aria-label="打开设置">
      <svg className={`icon ${styles.settingsIcon}`} aria-hidden="true">
        <use xlinkHref="#icon-shezhi"></use>
      </svg>
    </button>
  );
};

export default SettingsPage;
