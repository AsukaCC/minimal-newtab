import React from 'react';
import { useAppSelector } from '../../../../store/hooks';
import { useI18n } from '../../../../hooks/useI18n';
import styles from './index.module.css';

interface SyncHistorySettingProps {
  onOpenHistory: () => void;
}

const SyncHistorySetting: React.FC<SyncHistorySettingProps> = ({ onOpenHistory }) => {
  const { t } = useI18n();
  const isLoggedIn = useAppSelector((state) => state.userInfo.isLoggedIn);

  // 只在登录后显示
  if (isLoggedIn !== true) {
    return null;
  }

  return (
    <div
      className={styles.settingItem}
      role="button"
      tabIndex={0}
      aria-label={t('popup_showHistory')}
      onClick={onOpenHistory}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenHistory();
        }
      }}
    >
      <label className={styles.settingLabel}>
        <span className={styles.settingText}>{t('popup_syncTitle')}</span>
        <span className={styles.settingDescription}>
          {t('popup_syncDescription')}
        </span>
      </label>
    </div>
  );
};

export default SyncHistorySetting;
