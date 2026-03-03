import React from 'react';
import styles from '../../index.module.css';
import { CloseIcon } from '../../../../common/svgIcon';

export interface ConfigInfoHeaderProps {
  onClose: () => void;
  t: (key: string) => string | undefined;
}

const ConfigInfoHeader: React.FC<ConfigInfoHeaderProps> = ({ onClose, t }) => {
  return (
    <>
      <div className={styles.accountWrapper}>
        <div className={styles.accountInfo}>
          {/* 同步状态文字已移除，保留容器 */}
        </div>
      </div>
      <button onClick={onClose} aria-label={t('settings_closeSettings')} className={styles.closeButton}>
        <CloseIcon className={styles.closeIcon} />
      </button>
    </>
  );
};

export default ConfigInfoHeader;
