import React from 'react';
import { useI18n } from '../../../../hooks/useI18n';
import styles from './index.module.css';

interface NavBarSettingProps {
  onOpenConfig: () => void;
}

const NavBarSetting: React.FC<NavBarSettingProps> = ({ onOpenConfig }) => {
  const { t } = useI18n();

  return (
    <div
      className={styles.settingItem}
      role="button"
      tabIndex={0}
      aria-label={t('settings_navBarConfig') || '导航栏配置'}
      onClick={onOpenConfig}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenConfig();
        }
      }}
    >
      <label className={styles.settingLabel}>
        <span className={styles.settingText}>{t('settings_navBarConfig') || '导航栏配置'}</span>
        <span className={styles.settingDescription}>
          {t('settings_navBarConfigDescription') || '自定义底部导航栏的默认列表'}
        </span>
      </label>
    </div>
  );
};

export default NavBarSetting;
