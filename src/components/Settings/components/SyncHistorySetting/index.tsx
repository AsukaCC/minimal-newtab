import React, { useState } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import Button from '../../../Button';
import { useI18n } from '../../../../hooks/useI18n';
import SyncHistoryModal from '../../../SyncHistoryModal';
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
    <div className={styles.settingItem}>
      <label className={styles.settingLabel}>
        <span className={styles.settingText}>{t('popup_syncTitle')}</span>
        <span className={styles.settingDescription}>
          {t('popup_syncDescription')}
        </span>
      </label>
      <Button
        variant="primary"
        onClick={onOpenHistory}
        aria-label={t('popup_showHistory')}>
        {t('popup_showHistory')}
      </Button>
    </div>
  );
};

export default SyncHistorySetting;
