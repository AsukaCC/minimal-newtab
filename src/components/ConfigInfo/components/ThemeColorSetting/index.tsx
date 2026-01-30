import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setThemeColor } from '../../../../store';
import { useI18n } from '../../../../hooks/useI18n';
import styles from './index.module.css';

const ThemeColorSetting: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const themeColor = useAppSelector((state) => state.config.themeColor);

  const handleThemeColorChange = (color: string) => {
    dispatch(setThemeColor(color));
    // 使用 requestAnimationFrame 优化 CSS 变量更新，避免阻塞 UI
    requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--color-primary', color);
    });
  };

  return (
    <div className={styles.settingItem}>
      <label className={styles.settingLabel}>
        <span className={styles.settingText}>{t('settings_themeColor')}</span>
        <span className={styles.settingDescription}>{t('settings_themeColorDescription')}</span>
      </label>
      <div className={styles.themeColorPicker}>
        <input
          type="color"
          value={themeColor || '#667eea'}
          onChange={(e) => handleThemeColorChange(e.target.value)}
          className={styles.colorInput}
          aria-label={t('settings_selectThemeColor')}
        />
      </div>
    </div>
  );
};

export default ThemeColorSetting;
