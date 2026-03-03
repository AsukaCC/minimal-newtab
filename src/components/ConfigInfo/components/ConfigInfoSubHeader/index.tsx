import React from 'react';
import styles from '../../index.module.css';
import { BackIcon } from '../../../../common/svgIcon';
import { useI18n } from '../../../../hooks/useI18n';

export interface ConfigInfoSubHeaderProps {
  onBack: () => void;
  title?: string;
  titleKey?: string;
  actions?: React.ReactNode;
}

const ConfigInfoSubHeader: React.FC<ConfigInfoSubHeaderProps> = ({
  onBack,
  title,
  titleKey,
  actions,
}) => {
  const { t } = useI18n();
  const displayTitle = titleKey ? (t(titleKey) || title) : title;

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          onClick={onBack}
          aria-label={t('common_back')}
          className={styles.backButton}
        >
          <BackIcon className={styles.backIcon} />
        </button>
        {displayTitle && <span className={styles.subHeaderTitle}>{displayTitle}</span>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};

export default ConfigInfoSubHeader;
