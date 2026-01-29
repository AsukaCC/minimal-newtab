import React from 'react';
import Button from '../../../Button';
import { useI18n } from '../../../../hooks/useI18n';
import styles from './index.module.css';

interface ThemeAndLanguageSettingProps {
  onOpen: () => void;
}

const ThemeAndLanguageSetting: React.FC<ThemeAndLanguageSettingProps> = ({ onOpen }) => {
  const { t } = useI18n();

  return (
    <div className={styles.settingItem}>
      <label className={styles.settingLabel}>
        <span className={styles.settingText}>{t('settings_themeAndLanguage')}</span>
        <span className={styles.settingDescription}>
          {t('settings_themeAndLanguageDescription')}
        </span>
      </label>
      <Button
        variant="primary"
        onClick={onOpen}
        aria-label={t('settings_openThemeAndLanguage')}>
        {t('settings_openThemeAndLanguage')}
      </Button>
    </div>
  );
};

export default ThemeAndLanguageSetting;
