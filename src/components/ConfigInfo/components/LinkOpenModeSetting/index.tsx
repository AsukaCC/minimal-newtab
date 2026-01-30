import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setIsDirectLink } from '../../../../store';
import Switch from '../../../Switch';
import { useI18n } from '../../../../hooks/useI18n';
import styles from './index.module.css';

const LinkOpenModeSetting: React.FC = () => {
  const dispatch = useAppDispatch();
  const { t } = useI18n();
  const isDirectLinkValue = useAppSelector((state) => state.config.isDirectLink);
  // 确保 isDirectLink 始终是布尔值（防止字符串 "true"/"false"）
  const isDirectLink = typeof isDirectLinkValue === 'boolean'
    ? isDirectLinkValue
    : isDirectLinkValue === 'true' || isDirectLinkValue === true;

  const handleToggleDirectLink = (checked: boolean) => {
    dispatch(setIsDirectLink(checked));
  };

  return (
    <div className={styles.settingItem}>
      <label className={styles.settingLabel}>
        <span className={styles.settingText}>{t('settings_linkOpenMode')}</span>
        <span className={styles.settingDescription}>
          {isDirectLink ? t('settings_linkOpenModeCurrentTab') : t('settings_linkOpenModeNewTab')}
        </span>
      </label>
      <Switch
        checked={isDirectLink}
        onChange={handleToggleDirectLink}
        ariaLabel={t('settings_toggleLinkOpenMode')}
      />
    </div>
  );
};

export default LinkOpenModeSetting;
