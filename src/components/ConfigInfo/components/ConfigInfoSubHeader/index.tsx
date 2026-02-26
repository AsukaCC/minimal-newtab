import React from 'react';
import styles from '../../index.module.css';
import { BackIcon } from '../../../../common/svgIcon';

export interface ConfigInfoSubHeaderProps {
  onBack: () => void;
  t: (key: string) => string | undefined;
  title?: string;
  actions?: React.ReactNode;
}

const ConfigInfoSubHeader: React.FC<ConfigInfoSubHeaderProps> = ({
  onBack,
  t,
  title,
  actions,
}) => {
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
        {title && <span className={styles.subHeaderTitle}>{title}</span>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
};

export default ConfigInfoSubHeader;
