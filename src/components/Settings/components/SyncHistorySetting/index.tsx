import React, { useState } from 'react';
import { useAppSelector } from '../../../../store/hooks';
import Button from '../../../Button';
import { useI18n } from '../../../../hooks/useI18n';
import SyncHistoryModal from '../../../SyncHistoryModal';
import styles from './index.module.css';

const SyncHistorySetting: React.FC = () => {
  const { t } = useI18n();
  const isLoggedIn = useAppSelector((state) => state.userInfo.isLoggedIn);
  const [showSyncHistory, setShowSyncHistory] = useState(false);

  // 只在登录后显示
  if (isLoggedIn !== true) {
    return null;
  }

  return (
    <>
      <div className={styles.settingItem}>
        <label className={styles.settingLabel}>
          <span className={styles.settingText}>{t('popup.syncTitle')}</span>
          <span className={styles.settingDescription}>
            {t('popup.syncDescription')}
          </span>
        </label>
        <Button
          variant="primary"
          onClick={() => setShowSyncHistory(true)}
          aria-label={t('popup.showHistory')}>
          {t('popup.showHistory')}
        </Button>
      </div>
      <SyncHistoryModal isOpen={showSyncHistory} onClose={() => setShowSyncHistory(false)} />
    </>
  );
};

export default SyncHistorySetting;
