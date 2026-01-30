import React from 'react';
import { useI18n } from '../../../../hooks/useI18n';
import styles from './index.module.css';

interface ThemeAndLanguageSettingProps {
  onOpen: () => void;
}

const ThemeAndLanguageSetting: React.FC<ThemeAndLanguageSettingProps> = ({ onOpen }) => {
  const { t } = useI18n();

  return (
    <div
      className={styles.settingItem}
      role="button"
      tabIndex={0}
      aria-label={t('settings_openThemeAndLanguage')}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <label className={styles.settingLabel}>
        <span className={styles.settingText}>{t('settings_themeAndLanguage')}</span>
        <span className={styles.settingDescription}>
          {t('settings_themeAndLanguageDescription')}
        </span>
      </label>
    </div>
  );
};

export default ThemeAndLanguageSetting;
